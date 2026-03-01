import { createDb } from "../../lib/db";
import { makeTextPayload, type McpToolDefinition } from "./types";

type GetCategoriesInput = Record<string, never>;

export const getCategoriesTool: McpToolDefinition<GetCategoriesInput> = {
  name: "get_categories",
  description: "Return authenticated user's categories (for classifying transactions)",
  requiredScope: "read",
  inputSchema: {},
  handler: async (_input, { userId }) => {
    try {
      const db = createDb();
      const categories = await db.query.category.findMany({
        where: {
          user_id: userId,
        },
        orderBy: (categoriesEntity, { asc }) => asc(categoriesEntity.name),
      });

      return makeTextPayload({
        userId,
        count: categories.length,
        categories,
      });
    } catch (error) {
      console.error("MCP get_categories failed:", error);
      return {
        isError: true,
        content: [{ type: "text", text: "Failed to fetch categories." }],
      };
    }
  },
};
