import * as z from "zod/v4";

import { computeNetWorthHistory } from "../../lib/balance-history";
import { createDb } from "../../lib/db";
import { makeTextPayload, type McpToolDefinition } from "./types";

type GetBalanceHistoryInput = {
  from?: string;
  to?: string;
};

export const getBalanceHistoryTool: McpToolDefinition<GetBalanceHistoryInput> = {
  name: "get_balance_history",
  description:
    "Return net worth history over time, computed from transactions and market prices and converted to user currency",
  requiredScope: "read",
  inputSchema: {
    from: z.string().date().optional(),
    to: z.string().date().optional(),
  },
  handler: async ({ from, to }, { userId }) => {
    try {
      if (from && to && from > to) {
        return {
          isError: true,
          content: [{ type: "text", text: "Invalid date range: 'from' must be <= 'to'." }],
        };
      }

      const db = createDb();
      const userRow = await db.query.user.findFirst({
        where: { id: userId },
        columns: { currency: true },
      });
      const snapshots = await computeNetWorthHistory(
        db,
        userId,
        userRow?.currency ?? "EUR",
        from,
        to,
      );

      return makeTextPayload({
        currency: userRow?.currency ?? "EUR",
        snapshots,
      });
    } catch (error) {
      console.error("MCP get_balance_history failed:", error);
      return {
        isError: true,
        content: [{ type: "text", text: "Failed to fetch balance history." }],
      };
    }
  },
};
