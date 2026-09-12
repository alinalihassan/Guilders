import { Hono } from "hono";
import { z } from "zod";

import { selectProviderSchema } from "../../db/schema/providers";
import { documented, idParamSchema, jsonError, validate } from "../../lib/http";
import { requireAuth, type AuthEnv } from "../../middleware/auth";
import { errorSchema } from "../../utils/error";

export const providerRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .get(
    "/",
    documented({
      tags: ["Providers"],
      summary: "Get all providers",
      description: "Retrieve a list of all financial data providers",
      responses: { 200: z.array(selectProviderSchema) },
    }),
    async (c) => {
      const db = c.get("db");
      return c.json(await db.query.provider.findMany(), 200);
    },
  )
  .get(
    "/:id",
    documented({
      tags: ["Providers"],
      summary: "Get provider by ID",
      description: "Retrieve a specific provider by its ID",
      responses: { 200: selectProviderSchema, 404: errorSchema },
    }),
    validate("param", idParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const db = c.get("db");
      const result = await db.query.provider.findFirst({
        where: { id },
      });
      if (!result) {
        return jsonError(c, 404, "Provider not found");
      }
      return c.json(result, 200);
    },
  );
