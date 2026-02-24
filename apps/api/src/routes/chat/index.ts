import { env } from "cloudflare:workers";
import { pipeJsonRender } from "@json-render/core";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
} from "ai";
import { createAiGateway } from "ai-gateway-provider";
import { unified } from "ai-gateway-provider/providers/unified";
import { Elysia, status, t } from "elysia";
import { authPlugin } from "../../middleware/auth";
import { errorSchema } from "../../utils/error";
import { chatRequestSchema } from "./types";
import { getFinancialContext } from "./utils";

const JSON_RENDER_RULES = `You can render UI by emitting a JSONL spec wrapped in a fenced block:
\`\`\`spec
{"op":"add","path":"/root","value":"stock-card-1"}
{"op":"add","path":"/elements/stock-card-1","value":{"type":"StockCard","props":{"accountId":123,"subtype":"stock","image":"https://example.com/logo.png","symbol":"NVDA","accountName":"Trading212","currency":"EUR","currentValue":"1,529.81 EUR","totalChange":"-1.27% (-19.73 EUR)"},"children":[]}}
\`\`\`

Always write a short text explanation first, then the \`\`\`spec block.
Allowed components:
- StockCard

IMPORTANT format rules:
- Use valid JSON Patch lines only.
- In an element object, children must be an array of child element IDs (strings), never patch operations.
- Do not use any component outside the allowed list.
- For single stock/account responses, emit exactly one StockCard as the root element.
- StockCard props must be:
  accountId: number
  subtype: string | null
  image: string | null
  symbol: string
  accountName: string
  currency: string
  currentValue: string
  totalChange: string | null

When the user asks about a single stock account/asset, render one stable StockCard.
Use values from provided financial JSON context; do not invent data.`;

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
    async ({ body, user }) => {
      try {
        const { messages } = body;

        // Get financial context: standalone prompt + user data as JSON
        const { prompt, data } = await getFinancialContext(user.id);

        const systemContent = [
          prompt,
          "",
          "User's financial data (JSON):",
          JSON.stringify(data, null, 2),
          "",
          JSON_RENDER_RULES,
        ].join("\n");

        // Convert UIMessages to ModelMessages (AI SDK handles text, tools, files, etc.)
        const modelMessages = [
          {
            role: "system" as const,
            content: systemContent,
          },
          ...(await convertToModelMessages(messages as UIMessage[])),
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
        });

        // Convert mixed text/spec stream into AI SDK UI message stream
        const stream = createUIMessageStream({
          execute: async ({ writer }) => {
            writer.merge(pipeJsonRender(result.toUIMessageStream()));
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
          error:
            error instanceof Error
              ? error.message
              : "An unknown error occurred",
        });
      }
    },
    {
      auth: true,
      body: chatRequestSchema,
      response: {
        200: t.Any(), // Streaming response
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
