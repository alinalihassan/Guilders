import { eq } from "drizzle-orm";
import { createSelectSchema } from "drizzle-typebox";
import { Elysia, t } from "elysia";
import { rate } from "../../db/schema/rates";
import { db } from "../../lib/db";
import { authPlugin } from "../../middleware/auth";

const selectRateSchema = createSelectSchema(rate);

export const rateRoutes = new Elysia({ prefix: "/rate" })
  .use(authPlugin)
  .model({
    Rate: selectRateSchema,
  })
  .get(
    "",
    async ({ query }) => {
      const base = query.base || "USD";
      const rates = await db.select().from(rate);

      if (base === "USD") {
        return rates;
      }

      // Convert rates to base currency
      const baseRate = rates.find((r) => r.currency_code === base);
      if (!baseRate) {
        throw new Error("Base currency not found");
      }

      const baseRateValue = parseFloat(baseRate.rate);

      return rates.map((r) => ({
        currency_code: r.currency_code,
        rate: (parseFloat(r.rate) / baseRateValue).toString(),
      }));
    },
    {
      auth: true,
      query: t.Object({
        base: t.Optional(t.String({ minLength: 3, maxLength: 3 })),
      }),
      response: t.Array(selectRateSchema),
      detail: {
        summary: "Get all exchange rates",
        description:
          "Retrieve exchange rates with optional base currency conversion",
        tags: ["Rates"],
      },
    },
  )
  .get(
    "/:code",
    async ({ params, query }) => {
      const base = query.base || "USD";

      const result = await db
        .select()
        .from(rate)
        .where(eq(rate.currency_code, params.code));

      if (result.length === 0 || !result[0]) {
        throw new Error("Rate not found");
      }

      const rateValue = result[0];

      if (base !== "USD") {
        const baseRateResult = await db
          .select()
          .from(rate)
          .where(eq(rate.currency_code, base));
        if (baseRateResult.length === 0 || !baseRateResult[0]) {
          throw new Error("Base currency not found");
        }

        const baseRateValue = parseFloat(baseRateResult[0].rate);
        return {
          currency_code: rateValue.currency_code,
          rate: (parseFloat(rateValue.rate) / baseRateValue).toString(),
        };
      }

      return rateValue;
    },
    {
      auth: true,
      params: t.Object({
        code: t.String({ minLength: 3, maxLength: 3 }),
      }),
      query: t.Object({
        base: t.Optional(t.String({ minLength: 3, maxLength: 3 })),
      }),
      response: selectRateSchema,
      detail: {
        summary: "Get rate by currency code",
        description:
          "Retrieve exchange rate for a specific currency with optional base conversion",
        tags: ["Rates"],
      },
    },
  );
