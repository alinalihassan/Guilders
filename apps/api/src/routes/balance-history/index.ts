import { Hono } from "hono";
import { z } from "zod";

import { computeNetWorthHistory } from "../../lib/balance-history";
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

export const balanceHistoryRoutes = new Hono<AuthEnv>().use(requireAuth).get(
  "/",
  documented({
    tags: ["Balance History"],
    summary: "Get net worth history",
    description:
      "Returns daily net worth computed from transactions and market prices, converted to user currency",
    responses: { 200: netWorthResponseSchema },
  }),
  validate("query", dateRangeQuerySchema),
  async (c) => {
    const query = c.req.valid("query");
    const user = c.get("user");
    const snapshots = await computeNetWorthHistory(
      c.get("db"),
      user.id,
      user.currency ?? "EUR",
      query.from,
      query.to,
    );
    return c.json({ snapshots }, 200);
  },
);
