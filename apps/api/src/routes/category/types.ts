import { z } from "zod";

import type { Category as DbCategory, InsertCategory } from "../../db/schema/categories";

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  parent_id: z.number().int().nullable().optional(),
  color: z.string().min(4).max(7).optional(),
  icon: z.string().min(1).max(100).nullable().optional(),
  classification: z.enum(["income", "expense"]).optional(),
});

export type Category = DbCategory;
export type Categories = Category[];
export type CategoryInsert = Omit<InsertCategory, "id" | "user_id" | "created_at" | "updated_at">;
