import { and, eq } from "drizzle-orm";
import * as z from "zod/v4";

import { tag, transactionTag } from "../../db/schema/tags";
import { createDb } from "../../lib/db";
import { makeTextPayload, type McpToolDefinition } from "./types";

type DeleteTagInput = {
  id: number;
};

export const deleteTagTool: McpToolDefinition<DeleteTagInput> = {
  name: "delete_tag",
  description: "Delete a tag. Removes the tag from all transactions that use it.",
  requiredScope: "write",
  inputSchema: {
    id: z.number().int(),
  },
  handler: async ({ id }, { userId }) => {
    try {
      const db = createDb();
      const existing = await db.query.tag.findFirst({
        where: { id, user_id: userId },
      });
      if (!existing) {
        return {
          isError: true,
          content: [{ type: "text", text: "Tag not found or does not belong to user." }],
        };
      }

      await db.delete(transactionTag).where(eq(transactionTag.tag_id, id));
      await db.delete(tag).where(and(eq(tag.id, id), eq(tag.user_id, userId)));

      return makeTextPayload({
        userId,
        success: true,
        message: `Tag ${id} deleted successfully.`,
      });
    } catch (error) {
      console.error("MCP delete_tag failed:", error);
      return {
        isError: true,
        content: [{ type: "text", text: "Failed to delete tag." }],
      };
    }
  },
};
