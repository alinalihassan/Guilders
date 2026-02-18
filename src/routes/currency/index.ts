import { eq } from "drizzle-orm";
import { createSelectSchema } from "drizzle-typebox";
import { Elysia, t } from "elysia";
import { currency } from "../../db/schema/currencies";
import { db } from "../../lib/db";
import { authPlugin } from "../../middleware/auth";

const selectCurrencySchema = createSelectSchema(currency);

export const currencyRoutes = new Elysia({ prefix: "/currency" })
  .use(authPlugin)
  .model({
    Currency: selectCurrencySchema,
  })
  .get(
    "",
    async () => {
      return await db.select().from(currency);
    },
    {
      auth: true,
      response: t.Array(t.Ref("#/components/schemas/Currency")),
      detail: {
        summary: "Get all currencies",
        description: "Retrieve a list of all supported currencies",
        tags: ["Currencies"],
      },
    },
  )
  .get(
    "/:code",
    async ({ params }) => {
      const result = await db
        .select()
        .from(currency)
        .where(eq(currency.code, params.code));
      if (result.length === 0) {
        throw new Error("Currency not found");
      }
      return result[0];
    },
    {
      auth: true,
      params: t.Object({
        code: t.String({ minLength: 3, maxLength: 3 }),
      }),
      response: t.Ref("#/components/schemas/Currency"),
      detail: {
        summary: "Get currency by code",
        description: "Retrieve a specific currency by its ISO code",
        tags: ["Currencies"],
      },
    },
  );
