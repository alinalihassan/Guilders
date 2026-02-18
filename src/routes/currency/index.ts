import { Elysia, status, t } from "elysia";
import { selectCurrencySchema } from "../../db/schema/currencies";
import { db } from "../../lib/db";
import { authPlugin } from "../../middleware/auth";
import { errorSchema } from "../../utils/error";

export const currencyRoutes = new Elysia({ prefix: "/currency" })
  .use(authPlugin)
  .model({
    Currency: selectCurrencySchema,
  })
  .get(
    "",
    async () => {
      return db.query.currency.findMany();
    },
    {
      auth: true,
      response: t.Array(t.Ref("#/components/schemas/Currency")),
      detail: {
        summary: "Get all currencies",
        description: "Retrieve a list of all supported currencies",
        tags: ["Currencies"],
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get(
    "/:code",
    async ({ params }) => {
      const result = await db.query.currency.findFirst({
        where: {
          code: params.code,
        }
      });

      if (!result) {
        return status(404, { error: "Currency not found" });
      }

      return result;
    },
    {
      auth: true,
      params: t.Object({
        code: t.String({ minLength: 3, maxLength: 3 }),
      }),
      response: {
        200: t.Ref("#/components/schemas/Currency"),
        404: errorSchema,
      },
      detail: {
        summary: "Get currency by code",
        description: "Retrieve a specific currency by its ISO code",
        tags: ["Currencies"],
        security: [{ bearerAuth: [] }],
      },
    },
  );
