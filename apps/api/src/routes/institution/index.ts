import { Hono } from "hono";
import { z } from "zod";

import { selectInstitutionSchema } from "../../db/schema/institutions";
import { documented, idParamSchema, jsonError, validate } from "../../lib/http";
import { requireAuth, type AuthEnv } from "../../middleware/auth";
import { errorSchema } from "../../utils/error";

export const institutionRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .get(
    "/",
    documented({
      tags: ["Institutions"],
      summary: "Get all institutions",
      description: "Retrieve a list of all enabled financial institutions",
      responses: { 200: z.array(selectInstitutionSchema) },
    }),
    async (c) => {
      const db = c.get("db");
      return c.json(
        await db.query.institution.findMany({
          where: { enabled: true },
        }),
        200,
      );
    },
  )
  .get(
    "/:id",
    documented({
      tags: ["Institutions"],
      summary: "Get institution by ID",
      description: "Retrieve a specific institution by its ID",
      responses: { 200: selectInstitutionSchema, 404: errorSchema },
    }),
    validate("param", idParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const db = c.get("db");
      const result = await db.query.institution.findFirst({
        where: { id, enabled: true },
      });
      if (!result) {
        return jsonError(c, 404, "Institution not found");
      }
      return c.json(result, 200);
    },
  );
