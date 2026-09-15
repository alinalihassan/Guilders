import { createDb } from "../../lib/db";
import { makeTextPayload, type McpToolDefinition } from "./types";

type GetTagsInput = Record<string, never>;

export const getTagsTool: McpToolDefinition<GetTagsInput> = {
  name: "get_tags",
  description: "Return authenticated user's transaction tags",
  requiredScope: "read",
  inputSchema: {},
  handler: async (_input, { userId }) => {
    try {
      const db = createDb();
      const tags = await db.query.tag.findMany({
        where: { user_id: userId },
        orderBy: (tagsEntity, { asc }) => asc(tagsEntity.name),
      });

      return makeTextPayload({
        userId,
        count: tags.length,
        tags,
      });
    } catch (error) {
      console.error("MCP get_tags failed:", error);
      return {
        isError: true,
        content: [{ type: "text", text: "Failed to fetch tags." }],
      };
    }
  },
};
