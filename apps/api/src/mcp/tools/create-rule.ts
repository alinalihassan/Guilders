import { eq, max } from "drizzle-orm";
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

type CreateRuleInput = {
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

function toRulePayload(row: RuleWithRelations) {
  const { ruleAccounts, ruleTags, ...rest } = row;
  return {
    ...rest,
    account_ids: ruleAccounts.map((item) => item.account_id),
    tag_ids: ruleTags.map((item) => item.tag_id),
  };
}

export const createRuleTool: McpToolDefinition<CreateRuleInput> = {
  name: "create_rule",
  description:
    "Create a transaction automation rule. Rules run on sync in order; first category/name wins, tags add up.",
  requiredScope: "write",
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
      const accountIds = (input.account_ids ?? []).slice(0, 1);
      const tagIds = input.tag_ids ?? [];

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

      if (!(await validateTagIds(db, userId, tagIds))) {
        return {
          isError: true,
          content: [{ type: "text", text: "One or more tags were not found." }],
        };
      }

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

      const [{ value: maxPosition } = { value: null }] = await db
        .select({ value: max(rule.position) })
        .from(rule)
        .where(eq(rule.user_id, userId));

      const [created] = await db
        .insert(rule)
        .values({
          user_id: userId,
          enabled: true,
          position: maxPosition == null ? 0 : maxPosition + 1,
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
        })
        .returning();

      if (!created) {
        return {
          isError: true,
          content: [{ type: "text", text: "Failed to create rule." }],
        };
      }

      await replaceRuleAccounts(db, created.id, accountIds);
      await replaceRuleTags(db, created.id, tagIds);

      const rows = await loadAllUserRules(db, userId);
      const full = rows.find((row) => row.id === created.id);
      if (!full) {
        return {
          isError: true,
          content: [{ type: "text", text: "Failed to load created rule." }],
        };
      }

      return makeTextPayload({ userId, rule: toRulePayload(full) });
    } catch (error) {
      console.error("MCP create_rule failed:", error);
      return {
        isError: true,
        content: [{ type: "text", text: "Failed to create rule." }],
      };
    }
  },
};
