import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import * as z from "zod/v4";

import { account } from "../../db/schema/accounts";
import { document } from "../../db/schema/documents";
import { DocumentEntityTypeEnum } from "../../db/schema/enums";
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
    "Return authenticated user's transactions with associated document IDs (optional account filter, optional date range from/to)",
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
      const fromDate = from ? (typeof from === "string" ? new Date(from) : from) : null;
      const toDate = to ? (typeof to === "string" ? new Date(to) : to) : null;
      const conditions = [
        eq(account.user_id, userId),
        ...(accountId !== undefined ? [eq(transaction.account_id, accountId)] : []),
        ...(fromDate ? [gte(transaction.timestamp, fromDate)] : []),
        ...(toDate ? [lte(transaction.timestamp, toDate)] : []),
      ];

      const userTransactions = await db
        .select()
        .from(transaction)
        .innerJoin(account, eq(transaction.account_id, account.id))
        .where(and(...conditions))
        .orderBy(desc(transaction.timestamp))
        .limit(limit);

      const rawTransactions = userTransactions.map((row) => row.transaction);

      const transactionIds = rawTransactions.map((t) => t.id);
      const docRows =
        transactionIds.length > 0
          ? await db
              .select({ id: document.id, entity_id: document.entity_id })
              .from(document)
              .where(
                and(
                  eq(document.user_id, userId),
                  eq(document.entity_type, DocumentEntityTypeEnum.transaction),
                  inArray(document.entity_id, transactionIds),
                ),
              )
          : [];

      const docMap = new Map<number, number[]>();
      for (const row of docRows) {
        const list = docMap.get(row.entity_id) ?? [];
        list.push(row.id);
        docMap.set(row.entity_id, list);
      }

      const transactions = rawTransactions.map((t) => ({
        ...t,
        document_ids: docMap.get(t.id) ?? [],
      }));

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
