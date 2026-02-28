import { and, eq, gte, inArray, isNull, lte, max } from "drizzle-orm";
import { Elysia, t } from "elysia";

import { account } from "../../db/schema/accounts";
import { balanceSnapshot } from "../../db/schema/balance-snapshots";
import { rate } from "../../db/schema/rates";
import { authPlugin } from "../../middleware/auth";
import { errorSchema } from "../../utils/error";

const dateRangeQuery = t.Object({
  from: t.Optional(t.String({ format: "date" })),
  to: t.Optional(t.String({ format: "date" })),
});

function dateConditions(from?: string, to?: string) {
  const conditions = [];
  if (from) conditions.push(gte(balanceSnapshot.date, from));
  if (to) conditions.push(lte(balanceSnapshot.date, to));
  return conditions;
}

const snapshotResponseSchema = t.Object({
  snapshots: t.Array(
    t.Object({
      date: t.String(),
      balance: t.String(),
      currency: t.String(),
    }),
  ),
});

const netWorthResponseSchema = t.Object({
  snapshots: t.Array(
    t.Object({
      date: t.String(),
      balance: t.String(),
    }),
  ),
});

export const balanceHistoryRoutes = new Elysia({
  prefix: "/balance-history",
  detail: {
    tags: ["Balance History"],
    security: [{ bearerAuth: [] }],
  },
})
  .use(authPlugin)
  .get(
    "",
    async ({ query, user, db }) => {
      const userAccounts = await db
        .select({ id: account.id, type: account.type })
        .from(account)
        .where(and(eq(account.user_id, user.id), isNull(account.parent)));

      if (userAccounts.length === 0) {
        return { snapshots: [] };
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

      return { snapshots: result };
    },
    {
      auth: true,
      query: dateRangeQuery,
      response: netWorthResponseSchema,
      detail: {
        summary: "Get net worth history",
        description:
          "Returns aggregated net worth over time across all accounts, converted to user currency",
      },
    },
  );

export const accountBalanceHistoryRoutes = new Elysia({
  prefix: "/account",
  detail: {
    tags: ["Balance History"],
    security: [{ bearerAuth: [] }],
  },
})
  .use(authPlugin)
  .get(
    "/:id/balance-history",
    async ({ params, query, user, db, status }) => {
      const accountResult = await db.query.account.findFirst({
        where: {
          id: params.id,
          user_id: user.id,
        },
      });

      if (!accountResult) {
        return status(404, { error: "Account not found" });
      }

      const conditions = [
        eq(balanceSnapshot.account_id, params.id),
        ...dateConditions(query.from, query.to),
      ];

      const snapshots = await db
        .select({
          date: balanceSnapshot.date,
          balance: balanceSnapshot.balance,
          currency: balanceSnapshot.currency,
        })
        .from(balanceSnapshot)
        .where(and(...conditions))
        .orderBy(balanceSnapshot.date);

      return { snapshots };
    },
    {
      auth: true,
      params: t.Object({ id: t.Number() }),
      query: dateRangeQuery,
      response: {
        200: snapshotResponseSchema,
        404: errorSchema,
      },
      detail: {
        summary: "Get account balance history",
        description: "Returns daily balance snapshots for a single account",
      },
    },
  );
