import * as z from "zod/v4";

import { applyRuleToExisting } from "../../lib/apply-rules";
import { createDb } from "../../lib/db";
import { makeTextPayload, type McpToolDefinition } from "./types";

type ApplyRuleInput = {
  id: number;
};

export const applyRuleTool: McpToolDefinition<ApplyRuleInput> = {
  name: "apply_rule",
  description:
    "Apply an existing rule to matching existing transactions. Locked attributes are not overwritten.",
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

      const result = await applyRuleToExisting(db, userId, id);
      return makeTextPayload({ userId, ...result });
    } catch (error) {
      console.error("MCP apply_rule failed:", error);
      return {
        isError: true,
        content: [{ type: "text", text: "Failed to apply rule." }],
      };
    }
  },
};
