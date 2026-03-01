import * as z from "zod/v4";

import { category } from "../../db/schema/categories";
import { createDb } from "../../lib/db";
import { makeTextPayload, type McpToolDefinition } from "./types";

type CreateCategoryInput = {
  name: string;
  classification?: string;
  color?: string;
  icon?: string;
  parent_id?: number;
};

export const createCategoryTool: McpToolDefinition<CreateCategoryInput> = {
  name: "create_category",
  description: "Create a new transaction category (returns existing if name already exists)",
  requiredScope: "write",
  inputSchema: {
    name: z.string().min(1).max(100),
    classification: z.enum(["income", "expense"]).optional(),
    color: z.string().min(4).max(7).optional(),
    icon: z.string().min(1).max(100).optional(),
    parent_id: z.number().int().optional(),
  },
  handler: async ({ name, classification, color, icon, parent_id }, { userId }) => {
    try {
      const db = createDb();
      const normalizedName = name.trim();

      if (!normalizedName) {
        return {
          isError: true,
          content: [{ type: "text", text: "Category name is required." }],
        };
      }

      if (parent_id) {
        const parent = await db.query.category.findFirst({
          where: { id: parent_id, user_id: userId },
        });
        if (!parent) {
          return {
            isError: true,
            content: [{ type: "text", text: "Parent category not found or does not belong to user." }],
          };
        }
      }

      const existing = await db.query.category.findFirst({
        where: { user_id: userId, name: normalizedName },
      });

      if (existing) {
        return makeTextPayload({ userId, category: existing, alreadyExisted: true });
      }

      const [newCategory] = await db
        .insert(category)
        .values({
          user_id: userId,
          name: normalizedName,
          parent_id: parent_id ?? null,
          color: color ?? "#64748b",
          icon: icon ?? null,
          classification: classification ?? "expense",
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();

      if (!newCategory) {
        return {
          isError: true,
          content: [{ type: "text", text: "Failed to create category." }],
        };
      }

      return makeTextPayload({ userId, category: newCategory });
    } catch (error) {
      console.error("MCP create_category failed:", error);
      return {
        isError: true,
        content: [{ type: "text", text: "Failed to create category." }],
      };
    }
  },
};
