import { z } from "zod";

import type { InsertTag, Tag as DbTag } from "../../db/schema/tags";

export const createTagSchema = z.object({
  name: z.string().min(1).max(100),
});

export type Tag = DbTag;
export type Tags = Tag[];
export type TagInsert = Omit<InsertTag, "id" | "user_id" | "created_at" | "updated_at">;
