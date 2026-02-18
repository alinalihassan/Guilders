import { Elysia, status, t } from "elysia";
import { selectInstitutionSchema } from "../../db/schema/institutions";
import { db } from "../../lib/db";
import { authPlugin } from "../../middleware/auth";
import { errorSchema } from "../../utils/error";


export const institutionRoutes = new Elysia({ prefix: "/institution" })
  .use(authPlugin)
  .model({
    Institution: selectInstitutionSchema,
  })
  .get(
    "",
    async () => {
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
        tags: ["Institutions"],
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get(
    "/:id",
    async ({ params }) => {
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
      params: t.Object({
        id: t.Number(),
      }),
      response: {
        200: t.Ref("#/components/schemas/Institution"),
        404: errorSchema,
      },
      detail: {
        summary: "Get institution by ID",
        description: "Retrieve a specific institution by its ID",
        tags: ["Institutions"],
        security: [{ bearerAuth: [] }],
      },
    },
  );
