import { loadAllUserRules, type RuleWithRelations } from "../../lib/apply-rules";
import { createDb } from "../../lib/db";
import { makeTextPayload, type McpToolDefinition } from "./types";

type GetRulesInput = Record<string, never>;

function toRulePayload(row: RuleWithRelations) {
  const { ruleAccounts, ruleTags, ...rest } = row;
  return {
    ...rest,
    account_ids: ruleAccounts.map((item) => item.account_id),
    tag_ids: ruleTags.map((item) => item.tag_id),
  };
}

export const getRulesTool: McpToolDefinition<GetRulesInput> = {
  name: "get_rules",
  description: "Return authenticated user's transaction automation rules",
  requiredScope: "read",
  inputSchema: {},
  handler: async (_input, { userId }) => {
    try {
      const db = createDb();
      const rows = await loadAllUserRules(db, userId);
      const rules = rows.map(toRulePayload);
      return makeTextPayload({
        userId,
        count: rules.length,
        rules,
      });
    } catch (error) {
      console.error("MCP get_rules failed:", error);
      return {
        isError: true,
        content: [{ type: "text", text: "Failed to fetch rules." }],
      };
    }
  },
};
