import { Hono } from "hono";
import { z } from "zod";

import { selectCountrySchema } from "../../db/schema/countries";
import { documented, jsonError, validate } from "../../lib/http";
import { requireAuth, type AuthEnv } from "../../middleware/auth";
import { errorSchema } from "../../utils/error";

const countryCodeParamSchema = z.object({
  code: z.string().length(2),
});

export const countryRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .get(
    "/",
    documented({
      tags: ["Countries"],
      summary: "Get all countries",
      description: "Retrieve a list of all countries with their ISO codes and names",
      responses: { 200: z.array(selectCountrySchema) },
    }),
    async (c) => {
      const db = c.get("db");
      return c.json(await db.query.country.findMany(), 200);
    },
  )
  .get(
    "/:code",
    documented({
      tags: ["Countries"],
      summary: "Get country by code",
      description: "Retrieve a specific country by its ISO code",
      responses: { 200: selectCountrySchema, 404: errorSchema },
    }),
    validate("param", countryCodeParamSchema),
    async (c) => {
      const { code } = c.req.valid("param");
      const db = c.get("db");
      const result = await db.query.country.findFirst({
        where: { code },
      });
      if (!result) {
        return jsonError(c, 404, "Country not found");
      }
      return c.json(result, 200);
    },
  );
