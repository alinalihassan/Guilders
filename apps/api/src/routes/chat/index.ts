import { env } from "cloudflare:workers";
import { type ModelMessage, streamText } from "ai";
import { createAiGateway } from "ai-gateway-provider";
import { unified } from "ai-gateway-provider/providers/unified";
import { Elysia, status, t } from "elysia";
import type { Account } from "../../db/schema/accounts";
import type { Rate } from "../../db/schema/rates";
import type { Transaction } from "../../db/schema/transactions";
import { db } from "../../lib/db";
import { authPlugin } from "../../middleware/auth";
import { errorSchema } from "../../utils/error";

// Types for financial context
interface FinancialContext {
  text: string;
}

interface FinancialSummary {
  netWorth: number;
  accounts: Account[];
  transactions: Transaction[];
  exchangeRates: Rate[];
  primaryCurrency: string;
}

// UI Message types (AI SDK 6 format)
interface UIPart {
  type: string;
  text?: string;
}

interface UIMessage {
  id?: string;
  role: "user" | "assistant" | "system";
  parts: UIPart[];
}

// Schemas - AI SDK 6 UIMessage format
const uiPartSchema = t.Object({
  type: t.String(),
  text: t.Optional(t.String()),
});

const uiMessageSchema = t.Object({
  id: t.Optional(t.String()),
  role: t.Union([
    t.Literal("user"),
    t.Literal("assistant"),
    t.Literal("system"),
  ]),
  parts: t.Array(uiPartSchema),
});

const chatRequestSchema = t.Object({
  messages: t.Array(uiMessageSchema),
});

// Convert UIMessages to ModelMessages for the AI SDK
function convertToModelMessages(uiMessages: UIMessage[]): ModelMessage[] {
  return uiMessages.map((msg): ModelMessage => {
    // Extract text content from parts
    const textContent = msg.parts
      .filter((part) => part.type === "text" && part.text)
      .map((part) => part.text)
      .join("");

    return {
      role: msg.role,
      content: textContent,
    };
  });
}

// Helper functions
const getFinancialContext = async (
  userId: string,
): Promise<FinancialContext> => {
  // Get all accounts
  const accounts = await db.query.account.findMany({
    where: {
      user_id: userId,
    },
    with: {
      institutionConnection: {
        with: {
          institution: {
            with: {
              provider: true,
            },
          },
        },
      },
    },
  });

  // Get recent transactions
  const transactions = await db.query.transaction.findMany({
    where: {
      account: {
        user_id: userId,
      },
    },
    orderBy: (transactions, { desc }) => desc(transactions.date),
    limit: 50,
  });

  // Get exchange rates
  const exchangeRates = await db.query.rate.findMany();

  // Get user settings for primary currency
  const userSettings = await db.query.userSetting.findFirst({
    where: {
      user_id: userId,
    },
  });

  // Calculate net worth
  const netWorth = accounts.reduce((sum, acc) => {
    const value = parseFloat(acc.value.toString());
    return acc.type === "liability" ? sum - value : sum + value;
  }, 0);

  const summary: FinancialSummary = {
    netWorth,
    accounts,
    transactions,
    exchangeRates,
    primaryCurrency: userSettings?.currency || "EUR",
  };

  const prompt = generateSystemPrompt(summary);

  return {
    text: prompt,
  };
};

const generateSystemPrompt = (summary: FinancialSummary): string => {
  return `You are a helpful financial advisor assistant. You have access to the user's financial data and can provide personalized advice and insights.

Financial Overview:
- Net Worth: ${summary.netWorth.toFixed(2)} ${summary.primaryCurrency}
- Number of Accounts: ${summary.accounts.length}

Exchange Rates (Base: EUR):
${summary.exchangeRates.map((rate) => `- 1 EUR = ${rate.rate} ${rate.currency_code}`).join("\n")}

Account Details:${summary.accounts
      .map(
        (acc) => `
• ${acc.name} (${acc.type}/${acc.subtype})
  - Value: ${acc.value} ${acc.currency}${acc.cost
            ? `
  - Cost Basis: ${acc.cost} ${acc.currency}`
            : ""
          }`,
      )
      .join("")}

Recent Transactions:${summary.transactions
      .map(
        (t) => `
• Account ID ${t.account_id}:
  - ${t.date}: ${t.amount} ${t.currency} (${t.category}) - ${t.description}`,
      )
      .join("")}

Use this financial data and exchange rates to provide personalized advice and insights when relevant.
Consider exchange rates when discussing amounts in different currencies.

Be concise, helpful, and professional in your responses. If you don't have enough information to answer a specific question, say so clearly.`;
};

export const chatRoutes = new Elysia({
  prefix: "/chat",
  detail: {
    tags: ["Chat"],
    security: [{ bearerAuth: [] }],
  },
})
  .use(authPlugin)
  .model({
    ChatRequest: chatRequestSchema,
    UIMessage: uiMessageSchema,
  })
  .post(
    "/",
    async ({ body, user }) => {
      try {
        const { messages } = body as { messages: UIMessage[] };

        // Get financial context for the user
        const context = await getFinancialContext(user.id);

        // Convert UIMessages to ModelMessages
        const modelMessages: ModelMessage[] = [
          {
            role: "system",
            content: context.text,
          },
          ...convertToModelMessages(messages),
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
