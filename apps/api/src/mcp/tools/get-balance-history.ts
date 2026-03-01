import { and, eq, gte, inArray, isNull, lte, max } from "drizzle-orm";
import * as z from "zod/v4";

import { account } from "../../db/schema/accounts";
import { user } from "../../db/schema/auth";
import { balanceSnapshot } from "../../db/schema/balance-snapshots";
import { rate } from "../../db/schema/rates";
import { createDb } from "../../lib/db";
import { makeTextPayload, type McpToolDefinition } from "./types";

type GetBalanceHistoryInput = {
  from?: string;
  to?: string;
};

export const getBalanceHistoryTool: McpToolDefinition<GetBalanceHistoryInput> = {
  name: "get_balance_history",
  description:
    "Return net worth history over time, aggregated across all accounts and converted to user currency",
  requiredScope: "read",
  inputSchema: {
    from: z.string().date().optional(),
    to: z.string().date().optional(),
  },
  handler: async ({ from, to }, { userId }) => {
    try {
      const db = createDb();

      const userAccounts = await db
        .select({ id: account.id, type: account.type })
        .from(account)
        .where(and(eq(account.user_id, userId), isNull(account.parent)));

      if (userAccounts.length === 0) {
        return makeTextPayload({ userId, snapshots: [] });
      }

      const accountIds = userAccounts.map((a) => a.id);
      const accountTypeMap = new Map(userAccounts.map((a) => [a.id, a.type]));

      const conditions = [
        inArray(balanceSnapshot.account_id, accountIds),
        ...(from ? [gte(balanceSnapshot.date, from)] : []),
        ...(to ? [lte(balanceSnapshot.date, to)] : []),
      ];

      const snapshots = await db
        .select()
        .from(balanceSnapshot)
        .where(and(...conditions))
        .orderBy(balanceSnapshot.date);

      const [latestDate] = await db.select({ date: max(rate.date) }).from(rate);
      const rates = latestDate?.date
        ? await db.select().from(rate).where(eq(rate.date, latestDate.date))
        : [];
      const rateMap = new Map(rates.map((r) => [r.currency_code, Number(r.rate)]));

      const [userRow] = await db
        .select({ currency: user.currency })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);
      const userCurrency = userRow?.currency ?? "EUR";
      const userRate = rateMap.get(userCurrency) ?? 1;

      const dateMap = new Map<string, number>();
      for (const snap of snapshots) {
        const bal = Number(snap.balance);
        const fromRate = rateMap.get(snap.currency) ?? 1;
        const converted = (bal * userRate) / fromRate;
        const accountType = accountTypeMap.get(snap.account_id);
        const signedBalance = accountType === "liability" ? -Math.abs(converted) : converted;
        dateMap.set(snap.date, (dateMap.get(snap.date) ?? 0) + signedBalance);
      }

      const result = Array.from(dateMap.entries())
        .toSorted(([a], [b]) => a.localeCompare(b))
        .map(([date, balance]) => ({
          date,
          balance: balance.toFixed(4),
        }));

      return makeTextPayload({ userId, currency: userCurrency, snapshots: result });
    } catch (error) {
      console.error("MCP get_balance_history failed:", error);
      return {
        isError: true,
        content: [{ type: "text", text: "Failed to fetch balance history." }],
      };
    }
  },
};
