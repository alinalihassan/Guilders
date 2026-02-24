import { env } from "cloudflare:workers";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createAiGateway } from "ai-gateway-provider";
import { unified } from "ai-gateway-provider/providers/unified";
import { Elysia, status, t } from "elysia";
import { authPlugin } from "../../middleware/auth";
import { errorSchema } from "../../utils/error";
import { chatRequestSchema } from "./types";
import { getFinancialContext } from "./utils";

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

        // Return streaming response
        return result.toTextStreamResponse({
          headers: {
            "Content-Type": "text/event-stream",
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
