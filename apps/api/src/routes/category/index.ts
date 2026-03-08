import { waitUntil } from "cloudflare:workers";
import { and, asc, eq } from "drizzle-orm";
import { Elysia, status, t } from "elysia";

import {
  category,
  type Category as DbCategory,
  insertCategorySchema,
  selectCategorySchema,
} from "../../db/schema/categories";
import { deliverUserWebhookEvents } from "../../lib/user-webhooks";
import { authPlugin } from "../../middleware/auth";
import { errorSchema } from "../../utils/error";
import { categoryIdParamSchema, createCategorySchema, categoryTreeSchema } from "./types";
import type { CategoryTree } from "./types";

function buildCategoryTree(flat: DbCategory[]): CategoryTree[] {
  const byParent = new Map<number | null, DbCategory[]>();
  for (const c of flat) {
    const pid = c.parent_id;
    if (!byParent.has(pid)) byParent.set(pid, []);
    byParent.get(pid)!.push(c);
  }
  for (const arr of byParent.values()) {
    arr.sort((a, b) => a.name.localeCompare(b.name));
  }
  function children(parentId: number | null): CategoryTree[] {
    const list = byParent.get(parentId) ?? [];
    return list.map((c) => {
      const childList = children(c.id);
      const node: CategoryTree = {
        ...c,
        ...(childList.length > 0 ? { children: childList } : {}),
      };
      return node;
    });
  }
  return children(null);
}

export const categoryRoutes = new Elysia({
  prefix: "/category",
  detail: {
    tags: ["Categories"],
    security: [{ apiKeyAuth: [] }, { bearerAuth: [] }],
  },
})
  .use(authPlugin)
  .model({
    Category: selectCategorySchema,
    CategoryTree: categoryTreeSchema,
    CreateCategory: insertCategorySchema,
  })
  .get(
    "",
    async ({ user, db }) => {
      const flat = await db.query.category.findMany({
        where: { user_id: user.id },
        orderBy: (categories) => asc(categories.name),
      });
      return buildCategoryTree(flat);
    },
    {
      auth: true,
      response: t.Array(t.Ref("#/components/schemas/CategoryTree")),
      detail: {
        summary: "Get categories",
        description:
          "Retrieve all categories for the authenticated user as a tree (roots first, each node has optional children sorted by name).",
      },
    },
  )
  .post(
    "",
    async ({ body, user, db }) => {
      const normalizedName = body.name.trim();
      if (!normalizedName) {
        return status(400, { error: "Category name is required" });
      }

      if (body.parent_id) {
        const parentCategory = await db.query.category.findFirst({
          where: {
            id: body.parent_id,
            user_id: user.id,
          },
        });

        if (!parentCategory) {
          return status(404, { error: "Parent category not found" });
        }
      }

      const existingCategory = await db.query.category.findFirst({
        where: {
          user_id: user.id,
          name: normalizedName,
        },
      });

      if (existingCategory) {
        return existingCategory;
      }

      const [newCategory] = await db
        .insert(category)
        .values({
          user_id: user.id,
          name: normalizedName,
          parent_id: body.parent_id ?? null,
          color: body.color ?? "#64748b",
          icon: body.icon ?? null,
          classification: body.classification ?? "expense",
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();

      if (!newCategory) {
        return status(500, { error: "Failed to create category" });
      }

      waitUntil(
        deliverUserWebhookEvents(db, user.id, "category.created", { category: newCategory }),
      );

      return newCategory;
    },
    {
      auth: true,
      body: createCategorySchema,
      response: {
        200: "Category",
        400: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
      detail: {
        summary: "Create category",
        description: "Create a new category for the authenticated user",
      },
    },
  )
  .put(
    "/:id",
    async ({ params, body, user, db }) => {
      const existingCategory = await db.query.category.findFirst({
        where: {
          id: params.id,
          user_id: user.id,
        },
      });

      if (!existingCategory) {
        return status(404, { error: "Category not found" });
      }

      const normalizedName = body.name.trim();
      if (!normalizedName) {
        return status(400, { error: "Category name is required" });
      }

      if (body.parent_id && body.parent_id === params.id) {
        return status(400, { error: "Category cannot be its own parent" });
      }

      const [updatedCategory] = await db
        .update(category)
        .set({
          name: normalizedName,
          parent_id: body.parent_id ?? null,
          color: body.color ?? existingCategory.color ?? "#64748b",
          icon: body.icon === undefined ? existingCategory.icon : body.icon,
          classification: body.classification ?? existingCategory.classification,
          updated_at: new Date(),
        })
        .where(and(eq(category.id, params.id), eq(category.user_id, user.id)))
        .returning();

      if (!updatedCategory) {
        return status(500, { error: "Failed to update category" });
      }

      waitUntil(
        deliverUserWebhookEvents(db, user.id, "category.updated", { category: updatedCategory }),
      );

      return updatedCategory;
    },
    {
      auth: true,
      params: categoryIdParamSchema,
      body: createCategorySchema,
      response: {
        200: "Category",
        400: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
      detail: {
        summary: "Update category",
        description: "Update a category for the authenticated user",
      },
    },
  )
  .delete(
    "/:id",
    async ({ params, user, db }) => {
      const existingCategory = await db.query.category.findFirst({
        where: {
          id: params.id,
          user_id: user.id,
        },
      });

      if (!existingCategory) {
        return status(404, { error: "Category not found" });
      }

      const inUseTransaction = await db.query.transaction.findFirst({
        where: {
          category_id: params.id,
          account: {
            user_id: user.id,
          },
        },
      });

      if (inUseTransaction) {
        return status(400, { error: "Category is in use by existing transactions" });
      }

      await db.transaction(async (tx) => {
        await tx
          .update(category)
          .set({
            parent_id: null,
            updated_at: new Date(),
          })
          .where(and(eq(category.user_id, user.id), eq(category.parent_id, params.id)));

        await tx
          .delete(category)
          .where(and(eq(category.id, params.id), eq(category.user_id, user.id)));
      });

      waitUntil(
        deliverUserWebhookEvents(db, user.id, "category.deleted", { category: existingCategory }),
      );

      return { success: true };
    },
    {
      auth: true,
      params: categoryIdParamSchema,
      response: {
        200: t.Object({ success: t.Boolean() }),
        400: errorSchema,
        404: errorSchema,
      },
      detail: {
        summary: "Delete category",
        description: "Delete a category for the authenticated user",
      },
    },
  );
