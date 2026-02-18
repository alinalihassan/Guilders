import { and, eq } from "drizzle-orm";
import { createSelectSchema } from "drizzle-typebox";
import { Elysia, t } from "elysia";
import { providerConnection } from "../../db/schema/provider-connections";
import { db } from "../../lib/db";
import { authPlugin } from "../../middleware/auth";

const selectProviderConnectionSchema = createSelectSchema(providerConnection);

export const providerConnectionRoutes = new Elysia({
  prefix: "/provider-connection",
})
  .use(authPlugin)
  .model({
    ProviderConnection: selectProviderConnectionSchema,
  })
  .get(
    "",
    async ({ user }) => {
      return await db
        .select()
        .from(providerConnection)
        .where(eq(providerConnection.user_id, user.id));
    },
    {
      auth: true,
      response: t.Array(t.Ref("#/components/schemas/ProviderConnection")),
      detail: {
        summary: "Get all provider connections",
        description:
          "Retrieve all provider connections for the authenticated user",
        tags: ["Provider Connections"],
      },
    },
  )
  .get(
    "/:id",
    async ({ params, user }) => {
      const result = await db
        .select()
        .from(providerConnection)
        .where(
          and(
            eq(providerConnection.id, params.id),
            eq(providerConnection.user_id, user.id),
          ),
        );
      if (result.length === 0) {
        throw new Error("Provider connection not found");
      }
      return result[0];
    },
    {
      auth: true,
      params: t.Object({
        id: t.Number(),
      }),
      response: t.Ref("#/components/schemas/ProviderConnection"),
      detail: {
        summary: "Get provider connection by ID",
        description: "Retrieve a specific provider connection by its ID",
        tags: ["Provider Connections"],
      },
    },
  );
