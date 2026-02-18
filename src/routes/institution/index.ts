import { and, eq } from "drizzle-orm";
import { createSelectSchema } from "drizzle-typebox";
import { Elysia, t } from "elysia";
import { institution } from "../../db/schema/institutions";
import { db } from "../../lib/db";
import { authPlugin } from "../../middleware/auth";

const selectInstitutionSchema = createSelectSchema(institution);

export const institutionRoutes = new Elysia({ prefix: "/institution" })
  .use(authPlugin)
  .model({
    Institution: selectInstitutionSchema,
  })
  .get(
    "",
    async () => {
      // Only return enabled institutions (matching the old API behavior)
      return await db
        .select()
        .from(institution)
        .where(eq(institution.enabled, true));
    },
    {
      auth: true,
      response: t.Array(t.Ref("#/components/schemas/Institution")),
      detail: {
        summary: "Get all institutions",
        description: "Retrieve a list of all enabled financial institutions",
        tags: ["Institutions"],
      },
    },
  )
  .get(
    "/:id",
    async ({ params }) => {
      const result = await db
        .select()
        .from(institution)
        .where(
          and(eq(institution.id, params.id), eq(institution.enabled, true)),
        );
      if (result.length === 0) {
        throw new Error("Institution not found");
      }
      return result[0];
    },
    {
      auth: true,
      params: t.Object({
        id: t.Number(),
      }),
      response: t.Ref("#/components/schemas/Institution"),
      detail: {
        summary: "Get institution by ID",
        description: "Retrieve a specific institution by its ID",
        tags: ["Institutions"],
      },
    },
  );
