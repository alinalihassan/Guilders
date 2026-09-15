import * as z from "zod/v4";

import { previewRuleMatches, type RuleWithRelations } from "../../lib/apply-rules";
import { createDb } from "../../lib/db";
import { makeTextPayload, type McpToolDefinition } from "./types";

type PreviewRuleInput = {
  payee_enabled?: boolean;
  payee_match?: "exact" | "contains" | null;
  payee_value?: string | null;
  amount_enabled?: boolean;
  amount_kind?: "any" | "spending" | "income" | null;
  amount_compare?: "lt" | "gt" | "between" | null;
  amount_value?: string | number | null;
  amount_value_max?: string | number | null;
  account_ids?: number[];
  set_category_id?: number | null;
  rename_merchant?: string | null;
  tag_ids?: number[];
};

function toNumericString(value: string | number | null | undefined): string | null {
  if (value == null || value === "") return null;
  return String(value);
}

export const previewRuleTool: McpToolDefinition<PreviewRuleInput> = {
  name: "preview_rule",
  description:
    "Preview how many existing transactions would match a rule configuration (does not modify data)",
  requiredScope: "read",
  inputSchema: {
    payee_enabled: z.boolean().optional(),
    payee_match: z.enum(["exact", "contains"]).nullable().optional(),
    payee_value: z.string().nullable().optional(),
    amount_enabled: z.boolean().optional(),
    amount_kind: z.enum(["any", "spending", "income"]).nullable().optional(),
    amount_compare: z.enum(["lt", "gt", "between"]).nullable().optional(),
    amount_value: z.union([z.string(), z.number()]).nullable().optional(),
    amount_value_max: z.union([z.string(), z.number()]).nullable().optional(),
    account_ids: z.array(z.number().int()).optional(),
    set_category_id: z.number().int().nullable().optional(),
    rename_merchant: z.string().nullable().optional(),
    tag_ids: z.array(z.number().int()).optional(),
  },
  handler: async (input, { userId }) => {
    try {
      const db = createDb();
      const draft: RuleWithRelations = {
        id: -1,
        user_id: userId,
        enabled: true,
        position: 0,
        payee_enabled: input.payee_enabled ?? false,
        payee_match: input.payee_match ?? null,
        payee_value: input.payee_value ?? null,
        amount_enabled: input.amount_enabled ?? false,
        amount_kind: input.amount_kind ?? null,
        amount_compare: input.amount_compare ?? null,
        amount_value: toNumericString(input.amount_value),
        amount_value_max: toNumericString(input.amount_value_max),
        set_category_id: input.set_category_id ?? null,
        rename_merchant: input.rename_merchant?.trim() || null,
        created_at: new Date(),
        updated_at: new Date(),
        ruleAccounts: (input.account_ids ?? []).slice(0, 1).map((account_id) => ({
          rule_id: -1,
          account_id,
        })),
        ruleTags: (input.tag_ids ?? []).map((tag_id) => ({ rule_id: -1, tag_id })),
      };

      const { count, samples } = await previewRuleMatches(db, userId, draft);
      return makeTextPayload({
        userId,
        count,
        samples: samples.map((sample) => ({
          id: sample.id,
          description: sample.description,
          amount: sample.amount,
          merchant_name: sample.merchant_name ?? null,
          category_id: sample.category_id ?? null,
        })),
      });
    } catch (error) {
      console.error("MCP preview_rule failed:", error);
      return {
        isError: true,
        content: [{ type: "text", text: "Failed to preview rule matches." }],
      };
    }
  },
};
