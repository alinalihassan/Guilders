import { Elysia, status, t } from "elysia";

import { selectProviderSchema } from "../../db/schema/providers";
import { authPlugin } from "../../middleware/auth";
import { errorSchema } from "../../utils/error";
import { providerIdParamSchema } from "./types";

export const providerRoutes = new Elysia({
  prefix: "/provider",
  detail: {
    tags: ["Providers"],
    security: [{ bearerAuth: [] }],
  },
})
  .use(authPlugin)
  .model({
    Provider: selectProviderSchema,
  })
  .get(
    "",
    async ({ db }) => {
      return db.query.provider.findMany();
    },
    {
      auth: true,
      response: t.Array(t.Ref("#/components/schemas/Provider")),
      detail: {
        summary: "Get all providers",
        description: "Retrieve a list of all financial data providers",
      },
    },
  )
  .get(
    "/:id",
    async ({ params, db }) => {
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
      params: providerIdParamSchema,
      response: {
        200: "Provider",
        404: errorSchema,
      },
      detail: {
        summary: "Get provider by ID",
        description: "Retrieve a specific provider by its ID",
      },
    },
  );
