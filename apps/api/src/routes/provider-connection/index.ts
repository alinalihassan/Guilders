import { Hono } from "hono";
import { z } from "zod";

import { selectProviderConnectionSchema } from "../../db/schema/provider-connections";
import { documented, idParamSchema, jsonError, validate } from "../../lib/http";
import { requireAuth, type AuthEnv } from "../../middleware/auth";
import { errorSchema } from "../../utils/error";

export const providerConnectionRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .get(
    "/",
    documented({
      tags: ["Provider Connections"],
      summary: "Get all provider connections",
      description: "Retrieve all provider connections for the authenticated user",
      responses: { 200: z.array(selectProviderConnectionSchema) },
    }),
    async (c) => {
      const user = c.get("user");
      const db = c.get("db");
      return c.json(
        await db.query.providerConnection.findMany({
          where: { user_id: user.id },
        }),
        200,
      );
    },
  )
  .get(
    "/:id",
    documented({
      tags: ["Provider Connections"],
      summary: "Get provider connection by ID",
      description: "Retrieve a specific provider connection by its ID",
      responses: { 200: selectProviderConnectionSchema, 404: errorSchema },
    }),
    validate("param", idParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const user = c.get("user");
      const db = c.get("db");
      const result = await db.query.providerConnection.findFirst({
        where: { id, user_id: user.id },
      });
      if (!result) {
        return jsonError(c, 404, "Provider connection not found");
      }
      return c.json(result, 200);
    },
  );
