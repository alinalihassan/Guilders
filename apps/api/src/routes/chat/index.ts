import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  jsonSchema,
  tool,
  type UIMessage,
} from "ai";
import { createAiGateway } from "ai-gateway-provider";
import { unified } from "ai-gateway-provider/providers/unified";
import { env } from "cloudflare:workers";
import { Elysia, status, t } from "elysia";

import { authPlugin } from "../../middleware/auth";
import { errorSchema } from "../../utils/error";
import { chatRequestSchema } from "./types";
import { getFinancialContext } from "./utils";

const STOCK_CARD_TOOL_RULES = `You can render a stock card by calling the tool "showStockCard".

Always respond with a concise text explanation first. Then, if the user asks about a single stock account/asset, call "showStockCard" exactly once.

The tool input must be:
- accountId: number
- subtype: string | null
- image: string | null
- symbol: string
- accountName: string
- currency: string
- value: number
- cost: number | null
- currentValue: string | null
- totalChange: string | null

Use values from provided financial JSON context only. Do not invent data.
Do not call the tool for non-stock requests.`;

// For future "buy stock" / "sell stock" actions, add a mutating tool with `needsApproval: true`
// so execution only continues after explicit user confirmation in the chat UI.

const showStockCard = tool({
  description:
    "Render a stock account summary card in the UI when the user asks about a single stock account/asset.",
  inputSchema: jsonSchema({
    type: "object",
    properties: {
      accountId: { type: "number" },
      subtype: { type: ["string", "null"] },
      image: { type: ["string", "null"] },
      symbol: { type: "string" },
      accountName: { type: "string" },
      currency: { type: "string" },
      value: { type: "number" },
      cost: { type: ["number", "null"] },
      currentValue: { type: ["string", "null"] },
      totalChange: { type: ["string", "null"] },
    },
    required: ["accountId", "symbol", "accountName", "currency", "value"],
    additionalProperties: false,
  }),
  execute: async (input) => input,
});

export const chatRoutes = new Elysia({
  prefix: "/chat",
  detail: {
    tags: ["Chat"],
    security: [{ bearerAuth: [] }],
    hide: true,
  },
})
  .use(authPlugin)
  .post(
    "/",
    async ({ body, user, db }) => {
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

        // Get financial context: standalone prompt + user data as JSON
        const { prompt, data } = await getFinancialContext(user.id, db);

        const systemContent = [
          prompt,
          "",
          "User's financial data (JSON):",
          JSON.stringify(data, null, 2),
          "",
          STOCK_CARD_TOOL_RULES,
        ].join("\n");

        // Convert UIMessages to ModelMessages (AI SDK handles text, tools, files, etc.)
        const modelMessages = [
          {
            role: "system" as const,
            content: systemContent,
          },
          ...(await convertToModelMessages(inputMessages as UIMessage[])),
        ];

        const aiGateway = createAiGateway({
          accountId: env.CLOUDFLARE_ACCOUNT_ID,
          gateway: env.CLOUDFLARE_AI_GATEWAY,
          apiKey: env.CLOUDFLARE_AI_GATEWAY_TOKEN,
        });

        // Stream the response using AI Gateway
        const result = streamText({
          model: aiGateway(unified("google-ai-studio/gemini-2.5-flash")),
          messages: modelMessages,
          tools: {
            showStockCard,
          },
          experimental_activeTools: ["showStockCard"],
        });

        // Stream tool and text parts directly to the UI.
        const stream = createUIMessageStream({
          execute: async ({ writer }) => {
            writer.merge(result.toUIMessageStream());
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
        200: t.Any(), // Streaming response
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
