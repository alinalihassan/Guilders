import {
  consumeStream,
  convertToModelMessages,
  createIdGenerator,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateText,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { createAiGateway } from "ai-gateway-provider";
import { unified } from "ai-gateway-provider/providers/unified";
import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { Elysia, status, t } from "elysia";

import { conversation } from "../../db/schema/conversations";
import { getChatLimitConfig } from "../../lib/chat-limits";
import { createDb } from "../../lib/db";
import { authPlugin } from "../../middleware/auth";
import { errorSchema } from "../../utils/error";
import { showStockCard, GENERATIVE_UI_TOOLS_OVERVIEW } from "./generative-ui-tools";
import { buildChatTools, getMcpToolsOverview } from "./mcp-tools";
import { chatRequestSchema, FINANCIAL_ADVISOR_PROMPT } from "./types";

const generateMessageId = createIdGenerator({ prefix: "msg", size: 16 });

function buildSystemContent(today: string): string {
  const mcpSection = getMcpToolsOverview();
  const uiSection = GENERATIVE_UI_TOOLS_OVERVIEW.map(
    (ui) => `- **${ui.name}**: ${ui.description}`,
  ).join("\n");
  return `${FINANCIAL_ADVISOR_PROMPT}

## Available tools (data and actions)
${mcpSection}

## UI tools (display in chat)
${uiSection}

Current date (use when the user says "today", "now", or similar): ${today}.`;
}

const chatLimitsResponseSchema = t.Object({
  limit: t.Number(),
  used: t.Number(),
  remaining: t.Number(),
  resetAt: t.Union([t.Number(), t.Null()]),
  tier: t.Union([t.Literal("free"), t.Literal("pro")]),
});

export const chatRoutes = new Elysia({
  prefix: "/chat",
  detail: {
    tags: ["Chat"],
    security: [{ apiKeyAuth: [] }, { bearerAuth: [] }],
    hide: true,
  },
})
  .use(authPlugin)
  .get(
    "/limits",
    async ({ user }) => {
      const config = await getChatLimitConfig(user.id);
      if (!env.CHAT_RATE_LIMITER) {
        return {
          limit: config.limit,
          used: 0,
          remaining: config.limit,
          resetAt: null,
          tier: config.tier,
        };
      }
      const id = env.CHAT_RATE_LIMITER.idFromName("chat:" + user.id);
      const stub = env.CHAT_RATE_LIMITER.get(id);
      const url = `https://do/status?limit=${config.limit}&periodSeconds=${config.periodSeconds}`;
      const res = await stub.fetch(url);
      if (!res.ok) {
        return {
          limit: config.limit,
          used: 0,
          remaining: config.limit,
          resetAt: null,
          tier: config.tier,
        };
      }
      const data = (await res.json()) as {
        used: number;
        remaining: number;
        limit: number;
        resetAt: number | null;
      };
      return {
        limit: data.limit,
        used: data.used,
        remaining: data.remaining,
        resetAt: data.resetAt,
        tier: config.tier,
      };
    },
    {
      auth: true,
      response: {
        200: chatLimitsResponseSchema,
        401: errorSchema,
      },
      detail: {
        summary: "Get chat rate limit status",
        description: "Returns remaining message count and tier for the AI Advisor chat.",
      },
    },
  )
  .post(
    "/",
    async ({ body, user, set }) => {
      try {
        const persistenceMode = !!(body.id && body.message);
        let inputMessages: UIMessage[];

        if (persistenceMode) {
          const db = createDb();
          const chat = await db.query.conversation.findFirst({
            where: { id: body.id!, user_id: user.id },
          });
          if (!chat) {
            return status(404, { error: "Conversation not found" });
          }
          const previousMessages = (chat.messages ?? []) as UIMessage[];
          inputMessages = [...previousMessages, body.message as UIMessage];
        } else {
          inputMessages =
            Array.isArray(body.messages) && body.messages.length > 0
              ? body.messages
              : body.message
                ? [body.message]
                : [];
        }

        if (inputMessages.length === 0) {
          return status(400, {
            error: "No chat messages were provided.",
          });
        }

        if (env.CHAT_RATE_LIMITER) {
          const config = await getChatLimitConfig(user.id);
          const id = env.CHAT_RATE_LIMITER.idFromName("chat:" + user.id);
          const stub = env.CHAT_RATE_LIMITER.get(id);
          const res = await stub.fetch("https://do/consume", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              limit: config.limit,
              periodSeconds: config.periodSeconds,
            }),
          });
          if (!res.ok) {
            return status(500, { error: "Rate limit check failed" });
          }
          const data = (await res.json()) as {
            allowed: boolean;
            remaining: number;
            resetAt: number | null;
          };
          if (!data.allowed) {
            if (data.resetAt != null) {
              set.headers["Retry-After"] = String(
                Math.max(1, data.resetAt - Math.floor(Date.now() / 1000)),
              );
            }
            return status(429, {
              error: "chat_rate_limit_exceeded",
              message:
                "You have used all your AI Advisor messages for this week. Upgrade to Pro for more.",
              remaining: 0,
              resetAt: data.resetAt,
            });
          }
        }

        const chatTools = buildChatTools(user.id);
        const today = new Date().toISOString().slice(0, 10);
        const systemContent = buildSystemContent(today);

        const modelMessages = [
          {
            role: "system" as const,
            content: systemContent,
          },
          ...(await convertToModelMessages(inputMessages)),
        ];

        const aiGateway = createAiGateway({
          accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
          gateway: process.env.CLOUDFLARE_AI_GATEWAY,
          apiKey: process.env.CLOUDFLARE_AI_GATEWAY_TOKEN,
        });

        const result = streamText({
          model: aiGateway(unified("google-ai-studio/gemini-2.5-flash")),
          messages: modelMessages,
          tools: {
            ...chatTools,
            showStockCard,
          },
          stopWhen: stepCountIs(10),
          onError(error) {
            console.error("Chat streamText error:", error);
          },
        });

        if (persistenceMode) {
          const chatId = body.id!;
          const isFirstExchange = inputMessages.length === 1;

          let titlePromise: Promise<string | null> | null = null;
          if (isFirstExchange) {
            const userText = inputMessages
              .filter((m) => m.role === "user")
              .map((m) =>
                m.parts
                  .filter((p): p is { type: "text"; text: string } => p.type === "text")
                  .map((p) => p.text)
                  .join(""),
              )
              .join(" ")
              .slice(0, 500);

            titlePromise = generateText({
              model: aiGateway(unified("workers-ai/@cf/meta/llama-4-scout-17b-16e-instruct")),
              prompt: `Generate a short title (max 6 words, no quotes, no punctuation at the end) for a conversation that starts with:\n"${userText}"`,
            })
              .then(({ text }) => text.trim() || null)
              .catch(() => null);
          }

          result.consumeStream();

          return result.toUIMessageStreamResponse({
            originalMessages: inputMessages,
            generateMessageId,
            consumeSseStream: consumeStream,
            onFinish: async ({ messages }) => {
              try {
                const db = createDb();
                const updates: Record<string, unknown> = {
                  messages: messages as unknown[],
                  updated_at: new Date(),
                };

                if (titlePromise) {
                  const title = await titlePromise;
                  if (title) updates.title = title.slice(0, 200);
                }

                await db
                  .update(conversation)
                  .set(updates)
                  .where(and(eq(conversation.id, chatId), eq(conversation.user_id, user.id)));
              } catch (err) {
                console.error("Failed to save conversation:", err);
              }
            },
            headers: {
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
            },
          });
        }

        const stream = createUIMessageStream({
          execute: async ({ writer }) => {
            writer.merge(
              result.toUIMessageStream({
                onError(error) {
                  console.error("Chat toUIMessageStream error:", error);
                  return "An error occurred while generating the response.";
                },
              }),
            );
          },
          onError(error) {
            console.error("Chat createUIMessageStream error:", error);
            return "An error occurred while generating the response.";
          },
        });

        return createUIMessageStreamResponse({
          stream,
          headers: {
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      } catch (error) {
        console.error("Chat error:", error);
        return status(500, {
          error: error instanceof Error ? error.message : "An unknown error occurred",
        });
      }
    },
    {
      auth: true,
      body: chatRequestSchema,
      response: {
        200: t.Any(),
        400: errorSchema,
        401: errorSchema,
        404: errorSchema,
        429: t.Object({
          error: t.String(),
          message: t.Optional(t.String()),
          remaining: t.Optional(t.Number()),
          resetAt: t.Optional(t.Union([t.Number(), t.Null()])),
        }),
        500: errorSchema,
      },
      detail: {
        summary: "Chat with AI financial advisor",
        description:
          "Stream a chat conversation with the AI financial advisor. Send messages and receive streaming responses based on your financial data.",
      },
    },
  );
