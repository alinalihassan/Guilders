import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { selectTagSchema, tag, transactionTag } from "../../db/schema/tags";
import { documented, idParamSchema, jsonError, successSchema, validate } from "../../lib/http";
import { requireAuth, type AuthEnv } from "../../middleware/auth";
import { errorSchema } from "../../utils/error";
import { createTagSchema } from "./types";

export const tagRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .get(
    "/",
    documented({
      tags: ["Tags"],
      summary: "Get tags",
      description: "Retrieve all tags for the authenticated user.",
      responses: { 200: z.array(selectTagSchema) },
    }),
    async (c) => {
      const user = c.get("user");
      const db = c.get("db");
      const tags = await db.query.tag.findMany({
        where: { user_id: user.id },
        orderBy: (t) => asc(t.name),
      });
      return c.json(tags, 200);
    },
  )
  .post(
    "/",
    documented({
      tags: ["Tags"],
      summary: "Create tag",
      description: "Create a new tag for the authenticated user",
      responses: { 200: selectTagSchema, 400: errorSchema, 500: errorSchema },
    }),
    validate("json", createTagSchema),
    async (c) => {
      const body = c.req.valid("json");
      const user = c.get("user");
      const db = c.get("db");

      const normalizedName = body.name.trim();
      if (!normalizedName) {
        return jsonError(c, 400, "Tag name is required");
      }

      const existing = await db.query.tag.findFirst({
        where: { user_id: user.id, name: normalizedName },
      });
      if (existing) return c.json(existing, 200);

      const [created] = await db
        .insert(tag)
        .values({
          user_id: user.id,
          name: normalizedName,
        })
        .returning();

      if (!created) return jsonError(c, 500, "Failed to create tag");
      return c.json(created, 200);
    },
  )
  .delete(
    "/:id",
    documented({
      tags: ["Tags"],
      summary: "Delete tag",
      description: "Delete a tag for the authenticated user",
      responses: { 200: successSchema, 404: errorSchema },
    }),
    validate("param", idParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const user = c.get("user");
      const db = c.get("db");

      const existing = await db.query.tag.findFirst({
        where: { id, user_id: user.id },
      });
      if (!existing) return jsonError(c, 404, "Tag not found");

      await db.delete(transactionTag).where(eq(transactionTag.tag_id, id));
      await db.delete(tag).where(and(eq(tag.id, id), eq(tag.user_id, user.id)));
      return c.json({ success: true }, 200);
    },
  );
