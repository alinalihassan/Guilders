import * as z from "zod/v4";

import { createDb } from "../../lib/db";
import { makeTextPayload, type McpToolDefinition } from "./types";

type GetTransactionsInput = {
  accountId?: number;
  limit: number;
};

export const getTransactionsTool: McpToolDefinition<GetTransactionsInput> = {
  name: "get_transactions",
  description: "Return authenticated user's transactions (optional account filter)",
  requiredScope: "read",
  inputSchema: {
    accountId: z.number().int().optional(),
    limit: z.number().int().min(1).max(100).default(50),
  },
  handler: async ({ accountId, limit }, { userId }) => {
    try {
      const db = createDb();
      const userTransactions = await db.query.transaction.findMany({
        where:
          accountId === undefined
            ? {
                account: {
                  user_id: userId,
                },
              }
            : {
                account_id: accountId,
                account: {
                  user_id: userId,
                },
              },
        limit,
        orderBy: (transactions, { desc }) => desc(transactions.date),
      });

      return makeTextPayload({
        userId,
        count: userTransactions.length,
        transactions: userTransactions,
      });
    } catch (error) {
      console.error("MCP get_transactions failed:", error);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: "Failed to fetch transactions.",
          },
        ],
      };
    }
  },
};
