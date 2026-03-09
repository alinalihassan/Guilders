import { and, eq } from "drizzle-orm";
import * as z from "zod/v4";

import { category } from "../../db/schema/categories";
import { createDb } from "../../lib/db";
import { makeTextPayload, type McpToolDefinition } from "./types";

type UpdateCategoryInput = {
  id: number;
  name?: string;
  classification?: string;
  color?: string;
  icon?: string;
  parent_id?: number | null;
};

export const updateCategoryTool: McpToolDefinition<UpdateCategoryInput> = {
  name: "update_category",
  description: "Update an existing category",
  requiredScope: "write",
  inputSchema: {
    id: z.number().int(),
    name: z.string().min(1).max(100).optional(),
    classification: z.enum(["income", "expense"]).optional(),
    color: z.string().min(4).max(7).optional(),
    icon: z.string().min(1).max(100).optional(),
    parent_id: z.number().int().positive().nullable().optional(),
  },
  handler: async ({ id, ...updates }, { userId }) => {
    try {
      const db = createDb();

      const existing = await db.query.category.findFirst({
        where: {
          id,
          user_id: userId,
        },
      });

      if (!existing) {
        return {
          isError: true,
          content: [{ type: "text", text: "Category not found or does not belong to user." }],
        };
      }

      if (updates.parent_id !== undefined && updates.parent_id !== null) {
        const parent = await db.query.category.findFirst({
          where: { id: updates.parent_id, user_id: userId },
        });
        if (!parent) {
          return {
            isError: true,
            content: [
              { type: "text", text: "Parent category not found or does not belong to user." },
            ],
          };
        }
      }

      const [updated] = await db
        .update(category)
        .set({
          ...updates,
          updated_at: new Date(),
        })
        .where(and(eq(category.id, id), eq(category.user_id, userId)))
        .returning();

      if (!updated) {
        return {
          isError: true,
          content: [{ type: "text", text: "Failed to update category." }],
        };
      }

      return makeTextPayload({ userId, category: updated });
    } catch (error) {
      console.error("MCP update_category failed:", error);
      return {
        isError: true,
        content: [{ type: "text", text: "Failed to update category." }],
      };
    }
  },
};
