import { eq } from "drizzle-orm";
import { createSelectSchema } from "drizzle-typebox";
import { Elysia, t } from "elysia";
import { provider } from "../../db/schema/providers";
import { db } from "../../lib/db";
import { authPlugin } from "../../middleware/auth";

const selectProviderSchema = createSelectSchema(provider);

export const providerRoutes = new Elysia({ prefix: "/provider" })
  .use(authPlugin)
  .model({
    Provider: selectProviderSchema,
  })
  .get(
    "",
    async () => {
      return await db.select().from(provider);
    },
    {
      auth: true,
      response: t.Array(t.Ref("#/components/schemas/Provider")),
      detail: {
        summary: "Get all providers",
        description: "Retrieve a list of all financial data providers",
        tags: ["Providers"],
      },
    },
  )
  .get(
    "/:id",
    async ({ params }) => {
      const result = await db
        .select()
        .from(provider)
        .where(eq(provider.id, params.id));
      if (result.length === 0 || !result[0]) {
        throw new Error("Provider not found");
      }
      return result[0];
    },
    {
      auth: true,
      params: t.Object({
        id: t.Number(),
      }),
      response: t.Ref("#/components/schemas/Provider"),
      detail: {
        summary: "Get provider by ID",
        description: "Retrieve a specific provider by its ID",
        tags: ["Providers"],
      },
    },
  );
