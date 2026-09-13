import {
  consumeStream,
  convertToModelMessages,
  createIdGenerator,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateText,
  isStepCount,
  streamText,
  type UIMessage,
} from "ai";
import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";

import { conversation } from "../../db/schema/conversations";
import { AI_GATEWAY_HEADERS, GEMINI_FLASH_MODEL, createGuildersAI } from "../../lib/ai";
import { getChatLimitConfig } from "../../lib/chat-limits";
import { createDb } from "../../lib/db";
import { documented, jsonError, validate } from "../../lib/http";
import { requireAuth, type AuthEnv } from "../../middleware/auth";
import { errorSchema } from "../../utils/error";
import { showStockCard, GENERATIVE_UI_TOOLS_OVERVIEW } from "./generative-ui-tools";
import { buildChatTools, getMcpToolsOverview } from "./mcp-tools";
import {
  chatLimitsResponseSchema,
  chatRateLimitErrorSchema,
  chatRequestSchema,
  FINANCIAL_ADVISOR_PROMPT,
} from "./types";

const generateMessageId = createIdGenerator({ prefix: "msg", size: 16 });

function buildSystemContent(today: string, readOnly: boolean): string {
  const mcpSection = getMcpToolsOverview(readOnly);
  const uiSection = GENERATIVE_UI_TOOLS_OVERVIEW.map(
    (ui) => `- **${ui.name}**: ${ui.description}`,
  ).join("\n");
  const permissionNote = readOnly
    ? "\n**You are in read-only mode.** You do not have create, update, or delete tools. If the user asks you to create, update, or delete anything, tell them to enable full access in the chat—do not mention that a tool is unavailable.\n"
    : "\n**You have full access.** Use create, update, and delete tools when the user asks you to change their data (e.g. update a transaction, create an account).\n";
  return `${FINANCIAL_ADVISOR_PROMPT}

## Available tools (data and actions)
${mcpSection}
${permissionNote}
## UI tools (display in chat)
${uiSection}

Current date (use when the user says "today", "now", or similar): ${today}.`;
}

export const chatRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .get(
    "/limits",
    documented({
      tags: ["Chat"],
      hide: true,
      summary: "Get chat rate limit status",
      description: "Returns remaining message count and tier for the AI Advisor chat.",
      responses: { 200: chatLimitsResponseSchema, 401: errorSchema },
    }),
    async (c) => {
      const user = c.get("user");
      const config = await getChatLimitConfig(user.id);
      if (!env.CHAT_RATE_LIMITER) {
        return c.json(
          {
            limit: config.limit,
            used: 0,
            remaining: config.limit,
            resetAt: null,
            tier: config.tier,
          },
          200,
        );
      }
      const id = env.CHAT_RATE_LIMITER.idFromName("chat:" + user.id);
      const stub = env.CHAT_RATE_LIMITER.get(id);
      const url = `https://do/status?limit=${config.limit}&periodSeconds=${config.periodSeconds}`;
      const res = await stub.fetch(url);
      if (!res.ok) {
        return c.json(
          {
            limit: config.limit,
            used: 0,
            remaining: config.limit,
            resetAt: null,
            tier: config.tier,
          },
          200,
        );
      }
      const data = (await res.json()) as {
        used: number;
        remaining: number;
        limit: number;
        resetAt: number | null;
      };
      return c.json(
        {
          limit: data.limit,
          used: data.used,
          remaining: data.remaining,
          resetAt: data.resetAt,
          tier: config.tier,
        },
        200,
      );
    },
  )
  .post(
    "/",
    documented({
      tags: ["Chat"],
      hide: true,
      summary: "Chat with AI financial advisor",
      description:
        "Stream a chat conversation with the AI financial advisor. Send messages and receive streaming responses based on your financial data.",
      responses: {
        400: errorSchema,
        401: errorSchema,
        404: errorSchema,
        429: chatRateLimitErrorSchema,
        500: errorSchema,
      },
    }),
    validate("json", chatRequestSchema),
    async (c) => {
      const body = c.req.valid("json");
      const user = c.get("user");

      try {
        const persistenceMode = !!(body.id && body.message);
        let inputMessages: UIMessage[];

        if (persistenceMode) {
          const db = createDb();
          const chat = await db.query.conversation.findFirst({
            where: { id: body.id!, user_id: user.id },
          });
          if (!chat) {
            return jsonError(c, 404, "Conversation not found");
          }
          const previousMessages = (chat.messages ?? []) as UIMessage[];
          inputMessages = [...previousMessages, body.message as UIMessage];
        } else {
          inputMessages =
            Array.isArray(body.messages) && body.messages.length > 0
              ? (body.messages as UIMessage[])
              : body.message
                ? [body.message as UIMessage]
                : [];
        }

        if (inputMessages.length === 0) {
          return jsonError(c, 400, "No chat messages were provided.");
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
            return jsonError(c, 500, "Rate limit check failed");
          }
          const data = (await res.json()) as {
            allowed: boolean;
            remaining: number;
            resetAt: number | null;
          };
          if (!data.allowed) {
            if (data.resetAt != null) {
              c.header(
                "Retry-After",
                String(Math.max(1, data.resetAt - Math.floor(Date.now() / 1000))),
              );
            }
            return c.json(
              {
                error: "chat_rate_limit_exceeded",
                message:
                  "You have used all your AI Advisor messages for this week. Upgrade to Pro for more.",
                remaining: 0,
                resetAt: data.resetAt,
              },
              429,
            );
          }
        }

        const chatTools = buildChatTools(user.id, body.readOnly);
        const today = new Date().toISOString().slice(0, 10);
        const systemContent = buildSystemContent(today, body.readOnly);

        const modelMessages = await convertToModelMessages(inputMessages);

        const ai = createGuildersAI();

        const result = streamText({
          model: ai(GEMINI_FLASH_MODEL),
          instructions: systemContent,
          messages: modelMessages,
          tools: {
            ...chatTools,
            showStockCard,
          },
          stopWhen: isStepCount(10),
          onError(error) {
            console.error("Chat streamText error:", error);
          },
          headers: AI_GATEWAY_HEADERS,
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
              model: ai("@cf/meta/llama-4-scout-17b-16e-instruct"),
              prompt: `Generate a short title (max 6 words, no quotes, no punctuation at the end) for a conversation that starts with:\n"${userText}"`,
              headers: AI_GATEWAY_HEADERS,
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
        return jsonError(
          c,
          500,
          error instanceof Error ? error.message : "An unknown error occurred",
        );
      }
    },
  );
