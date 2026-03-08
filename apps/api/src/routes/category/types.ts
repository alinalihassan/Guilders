import { t } from "elysia";

import type { Category as DbCategory, InsertCategory } from "../../db/schema/categories";

export const categoryIdParamSchema = t.Object({
  id: t.Number(),
});

export const createCategorySchema = t.Object({
  name: t.String({ minLength: 1, maxLength: 100 }),
  parent_id: t.Optional(t.Union([t.Number(), t.Null()])),
  color: t.Optional(t.String({ minLength: 4, maxLength: 7 })),
  icon: t.Optional(t.Union([t.String({ minLength: 1, maxLength: 100 }), t.Null()])),
  classification: t.Optional(t.Union([t.Literal("income"), t.Literal("expense")])),
});

/** Recursive tree node: category fields + optional children (same shape). */
export const categoryTreeSchema = t.Object({
  id: t.Number(),
  user_id: t.String(),
  name: t.String(),
  parent_id: t.Union([t.Number(), t.Null()]),
  color: t.Union([t.String(), t.Null()]),
  icon: t.Union([t.String(), t.Null()]),
  classification: t.String(),
  created_at: t.Date(),
  updated_at: t.Date(),
  children: t.Optional(t.Array(t.Any())),
});

export type Category = DbCategory;
export type Categories = Category[];
export type CategoryInsert = Omit<InsertCategory, "id" | "user_id" | "created_at" | "updated_at">;
export type CategoryTree = DbCategory & { children?: CategoryTree[] };
