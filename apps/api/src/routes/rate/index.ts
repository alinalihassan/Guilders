import { eq, max } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { rate, selectRateSchema } from "../../db/schema/rates";
import { codeParamSchema, documented, jsonError, validate } from "../../lib/http";
import { requireAuth, type AuthEnv } from "../../middleware/auth";
import { errorSchema } from "../../utils/error";
import { rateQuerySchema } from "./types";

export const rateRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .get(
    "/",
    documented({
      tags: ["Rates"],
      summary: "Get all exchange rates",
      description:
        "Retrieve exchange rates for a given date (defaults to latest available) with optional base currency conversion",
      responses: { 200: z.array(selectRateSchema), 401: errorSchema, 404: errorSchema },
    }),
    validate("query", rateQuerySchema),
    async (c) => {
      const query = c.req.valid("query");
      const db = c.get("db");
      const base = query.base || "EUR";

      let targetDate = query.date;
      if (!targetDate) {
        const [latest] = await db.select({ date: max(rate.date) }).from(rate);
        targetDate = latest?.date ?? undefined;
      }

      if (!targetDate) {
        return jsonError(c, 404, "No exchange rates available");
      }

      const rates = await db.select().from(rate).where(eq(rate.date, targetDate));

      if (base === "EUR") {
        return c.json(rates, 200);
      }

      const baseRate = rates.find((r) => r.currency_code === base);
      if (!baseRate) {
        return jsonError(c, 404, "Base currency not found");
      }

      const baseRateValue = parseFloat(baseRate.rate);

      return c.json(
        rates.map((r) => ({
          currency_code: r.currency_code,
          date: r.date,
          rate: (parseFloat(r.rate) / baseRateValue).toString(),
        })),
        200,
      );
    },
  )
  .get(
    "/:code",
    documented({
      tags: ["Rates"],
      summary: "Get rate by currency code",
      description:
        "Retrieve exchange rate for a specific currency on a given date (defaults to latest) with optional base conversion",
      responses: { 200: selectRateSchema, 401: errorSchema, 404: errorSchema },
    }),
    validate("param", codeParamSchema),
    validate("query", rateQuerySchema),
    async (c) => {
      const { code } = c.req.valid("param");
      const query = c.req.valid("query");
      const db = c.get("db");
      const base = query.base || "EUR";

      let targetDate = query.date;
      if (!targetDate) {
        const [latest] = await db.select({ date: max(rate.date) }).from(rate);
        targetDate = latest?.date ?? undefined;
      }

      if (!targetDate) {
        return jsonError(c, 404, "No exchange rates available");
      }

      const rates = await db.select().from(rate).where(eq(rate.date, targetDate));

      const result = rates.find((r) => r.currency_code === code);
      if (!result) {
        return jsonError(c, 404, "Rate not found");
      }

      if (base !== "EUR") {
        const baseRateResult = rates.find((r) => r.currency_code === base);
        if (!baseRateResult) {
          return jsonError(c, 404, "Base currency not found");
        }

        const baseRateValue = parseFloat(baseRateResult.rate);
        return c.json(
          {
            currency_code: result.currency_code,
            date: result.date,
            rate: (parseFloat(result.rate) / baseRateValue).toString(),
          },
          200,
        );
      }

      return c.json(result, 200);
    },
  );
