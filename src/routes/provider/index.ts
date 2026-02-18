import { Elysia, status, t } from "elysia";
import { selectProviderSchema } from "../../db/schema/providers";
import { db } from "../../lib/db";
import { authPlugin } from "../../middleware/auth";

export const providerRoutes = new Elysia({ prefix: "/provider" })
  .use(authPlugin)
  .model({
    Provider: selectProviderSchema,
  })
  .get(
    "",
    async () => {
      return db.query.provider.findMany();
    },
    {
      auth: true,
      response: t.Array(t.Ref("#/components/schemas/Provider")),
      detail: {
        summary: "Get all providers",
        description: "Retrieve a list of all financial data providers",
        tags: ["Providers"],
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get(
    "/:id",
    async ({ params }) => {
      const result = await db.query.provider.findFirst({
        where: {
          id: params.id,
        },
      });
      if (!result) {
        return status(404, { error: "Provider not found" });
      }
      return result;
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
        security: [{ bearerAuth: [] }],
      },
    },
  );
