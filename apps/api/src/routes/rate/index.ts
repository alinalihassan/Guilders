import { Elysia, status, t } from "elysia";
import { selectRateSchema } from "../../db/schema/rates";
import { db } from "../../lib/db";
import { authPlugin } from "../../middleware/auth";
import { errorSchema } from "../../utils/error";

export const rateRoutes = new Elysia({
  prefix: "/rate",
  detail: {
    tags: ["Rates"],
    security: [{ bearerAuth: [] }],
  }
})
  .use(authPlugin)
  .model({
    Rate: selectRateSchema,
  })
  .get(
    "",
    async ({ query }) => {
      const base = query.base || "EUR";
      const rates = await db.query.rate.findMany();

      if (base === "EUR") {
        return rates;
      }

      // Convert rates to base currency
      const baseRate = rates.find((r) => r.currency_code === base);
      if (!baseRate) {
        return status(404, { error: "Base currency not found" });
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
      response: {
        200: t.Array(t.Ref("#/components/schemas/Rate")),
        401: errorSchema,
        404: errorSchema,
      },
      detail: {
        summary: "Get all exchange rates",
        description:
          "Retrieve exchange rates with optional base currency conversion",
      },
    },
  )
  .get(
    "/:code",
    async ({ params, query }) => {
      const base = query.base || "EUR";

      const result = await db.query.rate.findFirst({
        where: {
          currency_code: params.code,
        },
      });
      if (!result) {
        return status(404, { error: "Rate not found" });
      }

      if (base !== "EUR") {
        const baseRateResult = await db.query.rate.findFirst({
          where: {
            currency_code: base,
          },
        });

        if (!baseRateResult) {
          return status(404, { error: "Base currency not found" });
        }

        const baseRateValue = parseFloat(baseRateResult.rate);
        return {
          currency_code: result.currency_code,
          rate: (parseFloat(result.rate) / baseRateValue).toString(),
        };
      }

      return result;
    },
    {
      auth: true,
      params: t.Object({
        code: t.String({ minLength: 3, maxLength: 3 }),
      }),
      query: t.Object({
        base: t.Optional(t.String({ minLength: 3, maxLength: 3 })),
      }),
      response: {
        200: "Rate",
        401: errorSchema,
        404: errorSchema,
      },
      detail: {
        summary: "Get rate by currency code",
        description:
          "Retrieve exchange rate for a specific currency with optional base conversion",
      },
    },
  );
