import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { createAiGateway } from "ai-gateway-provider";
import { unified } from "ai-gateway-provider/providers/unified";
import { Elysia, status, t } from "elysia";

import { authPlugin } from "../../middleware/auth";
import { errorSchema } from "../../utils/error";
import {
  showStockCard,
  GENERATIVE_UI_TOOLS_OVERVIEW,
} from "./generative-ui-tools";
import { buildChatTools, getMcpToolsOverview } from "./mcp-tools";
import { chatRequestSchema, FINANCIAL_ADVISOR_PROMPT } from "./types";

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

export const chatRoutes = new Elysia({
  prefix: "/chat",
  detail: {
    tags: ["Chat"],
    security: [{ apiKeyAuth: [] }, { bearerAuth: [] }],
    hide: true,
  },
})
  .use(authPlugin)
  .post(
    "/",
    async ({ body, user }) => {
      try {
        const inputMessages = Array.isArray(body.messages)
          ? body.messages
          : body.message
            ? [body.message]
            : [];

        if (inputMessages.length === 0) {
          return status(400, {
            error: "No chat messages were provided.",
          });
        }

        const chatTools = buildChatTools(user.id);
        const today = new Date().toISOString().slice(0, 10);
        const systemContent = buildSystemContent(today);

        const modelMessages = [
          {
            role: "system" as const,
            content: systemContent,
          },
          ...(await convertToModelMessages(inputMessages as UIMessage[])),
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
        500: errorSchema,
      },
      detail: {
        summary: "Chat with AI financial advisor",
        description:
          "Stream a chat conversation with the AI financial advisor. Send messages and receive streaming responses based on your financial data.",
      },
    },
  );
