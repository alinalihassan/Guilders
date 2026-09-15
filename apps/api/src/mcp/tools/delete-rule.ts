import { and, eq } from "drizzle-orm";
import * as z from "zod/v4";

import { rule } from "../../db/schema/rules";
import { createDb } from "../../lib/db";
import { makeTextPayload, type McpToolDefinition } from "./types";

type DeleteRuleInput = {
  id: number;
};

export const deleteRuleTool: McpToolDefinition<DeleteRuleInput> = {
  name: "delete_rule",
  description: "Delete a transaction automation rule. Existing transactions are not changed.",
  requiredScope: "write",
  inputSchema: {
    id: z.number().int(),
  },
  handler: async ({ id }, { userId }) => {
    try {
      const db = createDb();
      const existing = await db.query.rule.findFirst({
        where: { id, user_id: userId },
      });
      if (!existing) {
        return {
          isError: true,
          content: [{ type: "text", text: "Rule not found." }],
        };
      }

      await db.delete(rule).where(and(eq(rule.id, id), eq(rule.user_id, userId)));
      return makeTextPayload({
        userId,
        success: true,
        message: `Rule ${id} deleted successfully.`,
      });
    } catch (error) {
      console.error("MCP delete_rule failed:", error);
      return {
        isError: true,
        content: [{ type: "text", text: "Failed to delete rule." }],
      };
    }
  },
};
