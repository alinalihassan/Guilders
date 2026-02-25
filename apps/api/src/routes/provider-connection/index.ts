import { Elysia, status, t } from "elysia";

import { selectProviderConnectionSchema } from "../../db/schema/provider-connections";
import { authPlugin } from "../../middleware/auth";
import { errorSchema } from "../../utils/error";
import { providerConnectionIdParamSchema } from "./types";

export const providerConnectionRoutes = new Elysia({
  prefix: "/provider-connection",
  detail: {
    tags: ["Provider Connections"],
    security: [{ bearerAuth: [] }],
  },
})
  .use(authPlugin)
  .model({
    ProviderConnection: selectProviderConnectionSchema,
  })
  .get(
    "",
    async ({ user, db }) => {
      return db.query.providerConnection.findMany({
        where: {
          user_id: user.id,
        },
      });
    },
    {
      auth: true,
      response: t.Array(t.Ref("#/components/schemas/ProviderConnection")),
      detail: {
        summary: "Get all provider connections",
        description: "Retrieve all provider connections for the authenticated user",
      },
    },
  )
  .get(
    "/:id",
    async ({ params, user, db }) => {
      const result = await db.query.providerConnection.findFirst({
        where: {
          id: params.id,
          user_id: user.id,
        },
      });

      if (!result) {
        return status(404, { error: "Provider connection not found" });
      }

      return result;
    },
    {
      auth: true,
      params: providerConnectionIdParamSchema,
      response: {
        200: t.Ref("#/components/schemas/ProviderConnection"),
        404: errorSchema,
      },
      detail: {
        summary: "Get provider connection by ID",
        description: "Retrieve a specific provider connection by its ID",
      },
    },
  );
