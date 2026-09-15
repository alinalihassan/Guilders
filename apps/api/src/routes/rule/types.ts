import { z } from "zod";

import { selectRuleSchema } from "../../db/schema/rules";
import type { Rule as DbRule } from "../../db/schema/rules";

export const ruleConditionSchema = z.object({
  payee_enabled: z.boolean().default(false),
  payee_match: z.enum(["exact", "contains"]).nullable().optional(),
  payee_value: z.string().nullable().optional(),
  amount_enabled: z.boolean().default(false),
  amount_kind: z.enum(["any", "spending", "income"]).nullable().optional(),
  amount_compare: z.enum(["lt", "gt", "between"]).nullable().optional(),
  amount_value: z.union([z.string(), z.number()]).nullable().optional(),
  amount_value_max: z.union([z.string(), z.number()]).nullable().optional(),
  account_ids: z.array(z.number().int()).default([]),
});

export const ruleActionSchema = z.object({
  set_category_id: z.number().int().nullable().optional(),
  rename_merchant: z.string().nullable().optional(),
  tag_ids: z.array(z.number().int()).default([]),
});

export const createRuleSchema = z
  .object({
    enabled: z.boolean().default(true),
    position: z.number().int().optional(),
  })
  .merge(ruleConditionSchema)
  .merge(ruleActionSchema);

export const updateRuleSchema = createRuleSchema.partial();

export const previewRuleSchema = createRuleSchema;

export const ruleResponseSchema = selectRuleSchema.extend({
  account_ids: z.array(z.number().int()),
  tag_ids: z.array(z.number().int()),
});

export type Rule = DbRule & {
  account_ids: number[];
  tag_ids: number[];
};

export type RuleInsert = z.infer<typeof createRuleSchema>;
