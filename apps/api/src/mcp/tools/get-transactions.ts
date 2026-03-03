import { and, desc, eq, gte, lte } from "drizzle-orm";
import * as z from "zod/v4";

import { account } from "../../db/schema/accounts";
import { transaction } from "../../db/schema/transactions";
import { createDb } from "../../lib/db";
import { makeTextPayload, type McpToolDefinition } from "./types";

type GetTransactionsInput = {
  accountId?: number;
  from?: string;
  limit: number;
  to?: string;
};

export const getTransactionsTool: McpToolDefinition<GetTransactionsInput> = {
  name: "get_transactions",
  description:
    "Return authenticated user's transactions (optional account filter, optional date range from/to)",
  requiredScope: "read",
  inputSchema: {
    accountId: z.number().int().optional(),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    limit: z.number().int().min(1).max(100).default(50),
  },
  handler: async ({ accountId, from, to, limit }, { userId }) => {
    try {
      if (from && to && from > to) {
        return {
          isError: true,
          content: [{ type: "text", text: "Invalid date range: 'from' must be <= 'to'." }],
        };
      }

      const db = createDb();
      const conditions = [
        eq(account.user_id, userId),
        ...(accountId !== undefined ? [eq(transaction.account_id, accountId)] : []),
        ...(from ? [gte(transaction.date, from)] : []),
        ...(to ? [lte(transaction.date, to)] : []),
      ];

      const userTransactions = await db
        .select()
        .from(transaction)
        .innerJoin(account, eq(transaction.account_id, account.id))
        .where(and(...conditions))
        .orderBy(desc(transaction.date))
        .limit(limit);

      const transactions = userTransactions.map((row) => row.transaction);

      return makeTextPayload({
        userId,
        count: transactions.length,
        transactions,
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
