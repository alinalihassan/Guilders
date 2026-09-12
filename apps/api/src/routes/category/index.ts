import { waitUntil } from "cloudflare:workers";
import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { category, selectCategorySchema } from "../../db/schema/categories";
import { documented, idParamSchema, jsonError, successSchema, validate } from "../../lib/http";
import { deliverUserWebhookEvents } from "../../lib/user-webhooks";
import { isValidIconName } from "../../lib/valid-icon-name";
import { requireAuth, type AuthEnv } from "../../middleware/auth";
import { errorSchema } from "../../utils/error";
import { createCategorySchema } from "./types";

export const categoryRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .get(
    "/",
    documented({
      tags: ["Categories"],
      summary: "Get categories",
      description:
        "Retrieve all categories for the authenticated user. Build a tree client-side using parent_id if needed.",
      responses: { 200: z.array(selectCategorySchema) },
    }),
    async (c) => {
      const user = c.get("user");
      const db = c.get("db");
      const categories = await db.query.category.findMany({
        where: { user_id: user.id },
        orderBy: (cat) => asc(cat.name),
      });
      return c.json(categories, 200);
    },
  )
  .post(
    "/",
    documented({
      tags: ["Categories"],
      summary: "Create category",
      description: "Create a new category for the authenticated user",
      responses: {
        200: selectCategorySchema,
        400: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
    }),
    validate("json", createCategorySchema),
    async (c) => {
      const body = c.req.valid("json");
      const user = c.get("user");
      const db = c.get("db");

      const normalizedName = body.name.trim();
      if (!normalizedName) {
        return jsonError(c, 400, "Category name is required");
      }

      if (body.parent_id) {
        const parentCategory = await db.query.category.findFirst({
          where: {
            id: body.parent_id,
            user_id: user.id,
          },
        });

        if (!parentCategory) {
          return jsonError(c, 404, "Parent category not found");
        }
      }

      const existingCategory = await db.query.category.findFirst({
        where: {
          user_id: user.id,
          name: normalizedName,
        },
      });

      if (existingCategory) {
        return c.json(existingCategory, 200);
      }

      const normalizedIcon = body.icon === "" || body.icon == null ? null : body.icon;
      if (normalizedIcon != null && !isValidIconName(normalizedIcon)) {
        return jsonError(c, 400, "Invalid category icon name");
      }

      const [newCategory] = await db
        .insert(category)
        .values({
          user_id: user.id,
          name: normalizedName,
          parent_id: body.parent_id ?? null,
          color: body.color ?? "#64748b",
          icon: normalizedIcon,
          classification: body.classification ?? "expense",
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();

      if (!newCategory) {
        return jsonError(c, 500, "Failed to create category");
      }

      waitUntil(
        deliverUserWebhookEvents(db, user.id, "category.created", { category: newCategory }),
      );

      return c.json(newCategory, 200);
    },
  )
  .put(
    "/:id",
    documented({
      tags: ["Categories"],
      summary: "Update category",
      description: "Update a category for the authenticated user",
      responses: {
        200: selectCategorySchema,
        400: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
    }),
    validate("param", idParamSchema),
    validate("json", createCategorySchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const user = c.get("user");
      const db = c.get("db");

      const existingCategory = await db.query.category.findFirst({
        where: {
          id,
          user_id: user.id,
        },
      });

      if (!existingCategory) {
        return jsonError(c, 404, "Category not found");
      }

      const normalizedName = body.name.trim();
      if (!normalizedName) {
        return jsonError(c, 400, "Category name is required");
      }

      if (body.parent_id && body.parent_id === id) {
        return jsonError(c, 400, "Category cannot be its own parent");
      }

      const iconInput = body.icon === "" ? null : body.icon;
      if (iconInput != null && !isValidIconName(iconInput)) {
        return jsonError(c, 400, "Invalid category icon name");
      }
      const iconToSet = iconInput === undefined ? existingCategory.icon : iconInput;

      const [updatedCategory] = await db
        .update(category)
        .set({
          name: normalizedName,
          parent_id: body.parent_id ?? null,
          color: body.color ?? existingCategory.color ?? "#64748b",
          icon: iconToSet,
          classification: body.classification ?? existingCategory.classification,
          updated_at: new Date(),
        })
        .where(and(eq(category.id, id), eq(category.user_id, user.id)))
        .returning();

      if (!updatedCategory) {
        return jsonError(c, 500, "Failed to update category");
      }

      waitUntil(
        deliverUserWebhookEvents(db, user.id, "category.updated", { category: updatedCategory }),
      );

      return c.json(updatedCategory, 200);
    },
  )
  .delete(
    "/:id",
    documented({
      tags: ["Categories"],
      summary: "Delete category",
      description: "Delete a category for the authenticated user",
      responses: { 200: successSchema, 400: errorSchema, 404: errorSchema },
    }),
    validate("param", idParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const user = c.get("user");
      const db = c.get("db");

      const existingCategory = await db.query.category.findFirst({
        where: {
          id,
          user_id: user.id,
        },
      });

      if (!existingCategory) {
        return jsonError(c, 404, "Category not found");
      }

      const inUseTransaction = await db.query.transaction.findFirst({
        where: {
          category_id: id,
          account: {
            user_id: user.id,
          },
        },
      });

      if (inUseTransaction) {
        return jsonError(c, 400, "Category is in use by existing transactions");
      }

      await db.transaction(async (tx) => {
        await tx
          .update(category)
          .set({
            parent_id: null,
            updated_at: new Date(),
          })
          .where(and(eq(category.user_id, user.id), eq(category.parent_id, id)));

        await tx.delete(category).where(and(eq(category.id, id), eq(category.user_id, user.id)));
      });

      waitUntil(
        deliverUserWebhookEvents(db, user.id, "category.deleted", { category: existingCategory }),
      );

      return c.json({ success: true }, 200);
    },
  );
