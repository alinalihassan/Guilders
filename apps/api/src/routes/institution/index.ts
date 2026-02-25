import { Elysia, status, t } from "elysia";

import { selectInstitutionSchema } from "../../db/schema/institutions";
import { authPlugin } from "../../middleware/auth";
import { errorSchema } from "../../utils/error";
import { institutionIdParamSchema } from "./types";

export const institutionRoutes = new Elysia({
  prefix: "/institution",
  detail: {
    tags: ["Institutions"],
    security: [{ bearerAuth: [] }],
  },
})
  .use(authPlugin)
  .model({
    Institution: selectInstitutionSchema,
  })
  .get(
    "",
    async ({ db }) => {
      return db.query.institution.findMany({
        where: {
          enabled: true,
        },
      });
    },
    {
      auth: true,
      response: t.Array(t.Ref("#/components/schemas/Institution")),
      detail: {
        summary: "Get all institutions",
        description: "Retrieve a list of all enabled financial institutions",
      },
    },
  )
  .get(
    "/:id",
    async ({ params, db }) => {
      const result = await db.query.institution.findFirst({
        where: {
          id: params.id,
          enabled: true,
        },
      });

      if (!result) {
        return status(404, { error: "Institution not found" });
      }

      return result;
    },
    {
      auth: true,
      params: institutionIdParamSchema,
      response: {
        200: "Institution",
        404: errorSchema,
      },
      detail: {
        summary: "Get institution by ID",
        description: "Retrieve a specific institution by its ID",
      },
    },
  );
