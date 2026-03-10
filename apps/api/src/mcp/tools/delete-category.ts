import { and, eq } from "drizzle-orm";
import * as z from "zod/v4";

import { category } from "../../db/schema/categories";
import { createDb } from "../../lib/db";
import { makeTextPayload, type McpToolDefinition } from "./types";

type DeleteCategoryInput = {
  id: number;
};

export const deleteCategoryTool: McpToolDefinition<DeleteCategoryInput> = {
  name: "delete_category",
  description:
    "Delete a category. Transactions using this category will have their category_id set to null.",
  requiredScope: "write",
  inputSchema: {
    id: z.number().int(),
  },
  handler: async ({ id }, { userId }) => {
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

      await db.transaction(async (tx) => {
        await tx
          .update(category)
          .set({
            parent_id: null,
            updated_at: new Date(),
          })
          .where(and(eq(category.user_id, userId), eq(category.parent_id, id)));

        await tx.delete(category).where(and(eq(category.id, id), eq(category.user_id, userId)));
      });

      return makeTextPayload({
        userId,
        success: true,
        message: `Category ${id} deleted successfully.`,
      });
    } catch (error) {
      console.error("MCP delete_category failed:", error);
      return {
        isError: true,
        content: [{ type: "text", text: "Failed to delete category." }],
      };
    }
  },
};
