import { eq, max } from "drizzle-orm";
import { Elysia, status, t } from "elysia";

import { rate } from "../../db/schema/rates";
import { selectRateSchema } from "../../db/schema/rates";
import { authPlugin } from "../../middleware/auth";
import { errorSchema } from "../../utils/error";
import { rateCodeParamSchema, rateQuerySchema } from "./types";

export const rateRoutes = new Elysia({
  prefix: "/rate",
  detail: {
    tags: ["Rates"],
    security: [{ apiKeyAuth: [] }, { bearerAuth: [] }],
  },
})
  .use(authPlugin)
  .model({
    Rate: selectRateSchema,
  })
  .get(
    "",
    async ({ query, db }) => {
      const base = query.base || "EUR";

      let targetDate = query.date;
      if (!targetDate) {
        const [latest] = await db.select({ date: max(rate.date) }).from(rate);
        targetDate = latest?.date ?? undefined;
      }

      if (!targetDate) {
        return status(404, { error: "No exchange rates available" });
      }

      const rates = await db.select().from(rate).where(eq(rate.date, targetDate));

      if (base === "EUR") {
        return rates;
      }

      const baseRate = rates.find((r) => r.currency_code === base);
      if (!baseRate) {
        return status(404, { error: "Base currency not found" });
      }

      const baseRateValue = parseFloat(baseRate.rate);

      return rates.map((r) => ({
        currency_code: r.currency_code,
        date: r.date,
        rate: (parseFloat(r.rate) / baseRateValue).toString(),
      }));
    },
    {
      auth: true,
      query: rateQuerySchema,
      response: {
        200: t.Array(t.Ref("#/components/schemas/Rate")),
        401: errorSchema,
        404: errorSchema,
      },
      detail: {
        summary: "Get all exchange rates",
        description:
          "Retrieve exchange rates for a given date (defaults to latest available) with optional base currency conversion",
      },
    },
  )
  .get(
    "/:code",
    async ({ params, query, db }) => {
      const base = query.base || "EUR";

      let targetDate = query.date;
      if (!targetDate) {
        const [latest] = await db.select({ date: max(rate.date) }).from(rate);
        targetDate = latest?.date ?? undefined;
      }

      if (!targetDate) {
        return status(404, { error: "No exchange rates available" });
      }

      const rates = await db.select().from(rate).where(eq(rate.date, targetDate));

      const result = rates.find((r) => r.currency_code === params.code);
      if (!result) {
        return status(404, { error: "Rate not found" });
      }

      if (base !== "EUR") {
        const baseRateResult = rates.find((r) => r.currency_code === base);
        if (!baseRateResult) {
          return status(404, { error: "Base currency not found" });
        }

        const baseRateValue = parseFloat(baseRateResult.rate);
        return {
          currency_code: result.currency_code,
          date: result.date,
          rate: (parseFloat(result.rate) / baseRateValue).toString(),
        };
      }

      return result;
    },
    {
      auth: true,
      params: rateCodeParamSchema,
      query: rateQuerySchema,
      response: {
        200: "Rate",
        401: errorSchema,
        404: errorSchema,
      },
      detail: {
        summary: "Get rate by currency code",
        description:
          "Retrieve exchange rate for a specific currency on a given date (defaults to latest) with optional base conversion",
      },
    },
  );
