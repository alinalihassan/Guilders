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

export type Category = DbCategory;
export type Categories = Category[];
export type CategoryInsert = Omit<InsertCategory, "id" | "user_id" | "created_at" | "updated_at">;
