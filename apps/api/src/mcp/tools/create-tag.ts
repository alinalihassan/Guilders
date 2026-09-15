import * as z from "zod/v4";

import { tag } from "../../db/schema/tags";
import { createDb } from "../../lib/db";
import { makeTextPayload, type McpToolDefinition } from "./types";

type CreateTagInput = {
  name: string;
};

export const createTagTool: McpToolDefinition<CreateTagInput> = {
  name: "create_tag",
  description: "Create a new transaction tag (returns existing if name already exists)",
  requiredScope: "write",
  inputSchema: {
    name: z.string().min(1).max(100),
  },
  handler: async ({ name }, { userId }) => {
    try {
      const db = createDb();
      const normalizedName = name.trim();
      if (!normalizedName) {
        return {
          isError: true,
          content: [{ type: "text", text: "Tag name is required." }],
        };
      }

      const existing = await db.query.tag.findFirst({
        where: { user_id: userId, name: normalizedName },
      });
      if (existing) {
        return makeTextPayload({ userId, tag: existing, alreadyExisted: true });
      }

      const [created] = await db
        .insert(tag)
        .values({
          user_id: userId,
          name: normalizedName,
        })
        .returning();

      if (!created) {
        return {
          isError: true,
          content: [{ type: "text", text: "Failed to create tag." }],
        };
      }

      return makeTextPayload({ userId, tag: created });
    } catch (error) {
      console.error("MCP create_tag failed:", error);
      return {
        isError: true,
        content: [{ type: "text", text: "Failed to create tag." }],
      };
    }
  },
};
