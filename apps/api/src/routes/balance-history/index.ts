import { and, eq, gte, inArray, isNull, lte, max } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { account } from "../../db/schema/accounts";
import { balanceSnapshot } from "../../db/schema/balance-snapshots";
import { rate } from "../../db/schema/rates";
import { documented, validate } from "../../lib/http";
import { requireAuth, type AuthEnv } from "../../middleware/auth";
import { dateRangeQuerySchema } from "../account/types";

const netWorthResponseSchema = z.object({
  snapshots: z.array(
    z.object({
      date: z.string(),
      balance: z.string(),
    }),
  ),
});

function dateConditions(from?: string, to?: string) {
  const conditions = [];
  if (from) conditions.push(gte(balanceSnapshot.date, from));
  if (to) conditions.push(lte(balanceSnapshot.date, to));
  return conditions;
}

export const balanceHistoryRoutes = new Hono<AuthEnv>().use(requireAuth).get(
  "/",
  documented({
    tags: ["Balance History"],
    summary: "Get net worth history",
    description:
      "Returns aggregated net worth over time across all accounts, converted to user currency",
    responses: { 200: netWorthResponseSchema },
  }),
  validate("query", dateRangeQuerySchema),
  async (c) => {
    const query = c.req.valid("query");
    const user = c.get("user");
    const db = c.get("db");

    const userAccounts = await db
      .select({ id: account.id, type: account.type })
      .from(account)
      .where(and(eq(account.user_id, user.id), isNull(account.parent)));

    if (userAccounts.length === 0) {
      return c.json({ snapshots: [] }, 200);
    }

    const accountIds = userAccounts.map((a) => a.id);
    const accountTypeMap = new Map(userAccounts.map((a) => [a.id, a.type]));

    const conditions = [
      inArray(balanceSnapshot.account_id, accountIds),
      ...dateConditions(query.from, query.to),
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

    const userCurrency = user.currency ?? "EUR";
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

    return c.json({ snapshots: result }, 200);
  },
);
