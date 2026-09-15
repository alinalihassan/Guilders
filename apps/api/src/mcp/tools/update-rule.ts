import { and, eq } from "drizzle-orm";
import * as z from "zod/v4";

import { rule } from "../../db/schema/rules";
import {
  loadAllUserRules,
  replaceRuleAccounts,
  replaceRuleTags,
  type RuleWithRelations,
  validateTagIds,
} from "../../lib/apply-rules";
import { createDb } from "../../lib/db";
import { makeTextPayload, type McpToolDefinition } from "./types";

type UpdateRuleInput = {
  id: number;
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
  enabled?: boolean;
};

function toNumericString(value: string | number | null | undefined): string | null {
  if (value == null || value === "") return null;
  return String(value);
}

function toRulePayload(row: RuleWithRelations) {
  const { ruleAccounts, ruleTags, ...rest } = row;
  return {
    ...rest,
    account_ids: ruleAccounts.map((item) => item.account_id),
    tag_ids: ruleTags.map((item) => item.tag_id),
  };
}

export const updateRuleTool: McpToolDefinition<UpdateRuleInput> = {
  name: "update_rule",
  description: "Update an existing transaction automation rule",
  requiredScope: "write",
  inputSchema: {
    id: z.number().int(),
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
    enabled: z.boolean().optional(),
  },
  handler: async (input, { userId }) => {
    try {
      const db = createDb();
      const existing = await db.query.rule.findFirst({
        where: { id: input.id, user_id: userId },
      });
      if (!existing) {
        return {
          isError: true,
          content: [{ type: "text", text: "Rule not found." }],
        };
      }

      if (input.set_category_id != null) {
        const category = await db.query.category.findFirst({
          where: { id: input.set_category_id, user_id: userId },
        });
        if (!category) {
          return {
            isError: true,
            content: [{ type: "text", text: "Category not found." }],
          };
        }
      }

      if (input.tag_ids && !(await validateTagIds(db, userId, input.tag_ids))) {
        return {
          isError: true,
          content: [{ type: "text", text: "One or more tags were not found." }],
        };
      }

      const accountIds = input.account_ids?.slice(0, 1);
      if (accountIds) {
        for (const accountId of accountIds) {
          const account = await db.query.account.findFirst({
            where: { id: accountId, user_id: userId },
          });
          if (!account) {
            return {
              isError: true,
              content: [{ type: "text", text: "Account not found." }],
            };
          }
        }
      }

      await db
        .update(rule)
        .set({
          ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
          ...(input.payee_enabled !== undefined ? { payee_enabled: input.payee_enabled } : {}),
          ...(input.payee_match !== undefined ? { payee_match: input.payee_match } : {}),
          ...(input.payee_value !== undefined ? { payee_value: input.payee_value } : {}),
          ...(input.amount_enabled !== undefined ? { amount_enabled: input.amount_enabled } : {}),
          ...(input.amount_kind !== undefined ? { amount_kind: input.amount_kind } : {}),
          ...(input.amount_compare !== undefined ? { amount_compare: input.amount_compare } : {}),
          ...(input.amount_value !== undefined
            ? { amount_value: toNumericString(input.amount_value) }
            : {}),
          ...(input.amount_value_max !== undefined
            ? { amount_value_max: toNumericString(input.amount_value_max) }
            : {}),
          ...(input.set_category_id !== undefined
            ? { set_category_id: input.set_category_id }
            : {}),
          ...(input.rename_merchant !== undefined
            ? { rename_merchant: input.rename_merchant?.trim() || null }
            : {}),
          updated_at: new Date(),
        })
        .where(and(eq(rule.id, input.id), eq(rule.user_id, userId)));

      if (accountIds) await replaceRuleAccounts(db, input.id, accountIds);
      if (input.tag_ids) await replaceRuleTags(db, input.id, input.tag_ids);

      const rows = await loadAllUserRules(db, userId);
      const full = rows.find((row) => row.id === input.id);
      if (!full) {
        return {
          isError: true,
          content: [{ type: "text", text: "Failed to load updated rule." }],
        };
      }

      return makeTextPayload({ userId, rule: toRulePayload(full) });
    } catch (error) {
      console.error("MCP update_rule failed:", error);
      return {
        isError: true,
        content: [{ type: "text", text: "Failed to update rule." }],
      };
    }
  },
};
