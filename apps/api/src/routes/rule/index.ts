import { and, eq, max } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { rule } from "../../db/schema/rules";
import {
  applyRuleToExisting,
  loadAllUserRules,
  previewRuleMatches,
  replaceRuleAccounts,
  replaceRuleTags,
  type RuleWithRelations,
  validateTagIds,
} from "../../lib/apply-rules";
import { documented, idParamSchema, jsonError, successSchema, validate } from "../../lib/http";
import { requireAuth, type AuthEnv } from "../../middleware/auth";
import { errorSchema } from "../../utils/error";
import { createRuleSchema, previewRuleSchema, ruleResponseSchema, updateRuleSchema } from "./types";

function toRuleResponse(row: RuleWithRelations) {
  const { ruleAccounts, ruleTags, ...rest } = row;
  return {
    ...rest,
    account_ids: ruleAccounts.map((item) => item.account_id),
    tag_ids: ruleTags.map((item) => item.tag_id),
  };
}

function toNumericString(value: string | number | null | undefined): string | null {
  if (value == null || value === "") return null;
  return String(value);
}

export const ruleRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .get(
    "/",
    documented({
      tags: ["Rules"],
      summary: "Get rules",
      description:
        "Retrieve all transaction rules for the authenticated user, ordered by position.",
      responses: { 200: z.array(ruleResponseSchema) },
    }),
    async (c) => {
      const user = c.get("user");
      const db = c.get("db");
      const rows = await loadAllUserRules(db, user.id);
      return c.json(rows.map(toRuleResponse), 200);
    },
  )
  .post(
    "/",
    documented({
      tags: ["Rules"],
      summary: "Create rule",
      description: "Create a new transaction rule",
      responses: { 200: ruleResponseSchema, 400: errorSchema, 404: errorSchema, 500: errorSchema },
    }),
    validate("json", createRuleSchema),
    async (c) => {
      const body = c.req.valid("json");
      const user = c.get("user");
      const db = c.get("db");

      if (body.set_category_id != null) {
        const category = await db.query.category.findFirst({
          where: { id: body.set_category_id, user_id: user.id },
        });
        if (!category) return jsonError(c, 404, "Category not found");
      }

      if (!(await validateTagIds(db, user.id, body.tag_ids ?? []))) {
        return jsonError(c, 404, "One or more tags were not found");
      }

      for (const accountId of body.account_ids ?? []) {
        const account = await db.query.account.findFirst({
          where: { id: accountId, user_id: user.id },
        });
        if (!account) return jsonError(c, 404, "Account not found");
      }

      const [{ value: maxPosition } = { value: null }] = await db
        .select({ value: max(rule.position) })
        .from(rule)
        .where(eq(rule.user_id, user.id));

      const [created] = await db
        .insert(rule)
        .values({
          user_id: user.id,
          enabled: body.enabled ?? true,
          position: body.position ?? (maxPosition == null ? 0 : maxPosition + 1),
          payee_enabled: body.payee_enabled ?? false,
          payee_match: body.payee_match ?? null,
          payee_value: body.payee_value ?? null,
          amount_enabled: body.amount_enabled ?? false,
          amount_kind: body.amount_kind ?? null,
          amount_compare: body.amount_compare ?? null,
          amount_value: toNumericString(body.amount_value),
          amount_value_max: toNumericString(body.amount_value_max),
          set_category_id: body.set_category_id ?? null,
          rename_merchant: body.rename_merchant?.trim() || null,
        })
        .returning();

      if (!created) return jsonError(c, 500, "Failed to create rule");

      await replaceRuleAccounts(db, created.id, (body.account_ids ?? []).slice(0, 1));
      await replaceRuleTags(db, created.id, body.tag_ids ?? []);

      const full = await db.query.rule.findFirst({
        where: { id: created.id, user_id: user.id },
        with: { ruleAccounts: true, ruleTags: true },
      });
      if (!full) return jsonError(c, 500, "Failed to load created rule");
      return c.json(toRuleResponse(full as RuleWithRelations), 200);
    },
  )
  .post(
    "/preview",
    documented({
      tags: ["Rules"],
      summary: "Preview rule matches",
      description: "Count existing transactions that would match this rule configuration.",
      responses: {
        200: z.object({
          count: z.number(),
          samples: z.array(
            z.object({
              id: z.number(),
              description: z.string(),
              amount: z.union([z.string(), z.number()]),
              merchant_name: z.string().nullable().optional(),
              category_id: z.number().nullable().optional(),
            }),
          ),
        }),
      },
    }),
    validate("json", previewRuleSchema),
    async (c) => {
      const body = c.req.valid("json");
      const user = c.get("user");
      const db = c.get("db");

      const draft: RuleWithRelations = {
        id: -1,
        user_id: user.id,
        enabled: true,
        position: 0,
        payee_enabled: body.payee_enabled ?? false,
        payee_match: body.payee_match ?? null,
        payee_value: body.payee_value ?? null,
        amount_enabled: body.amount_enabled ?? false,
        amount_kind: body.amount_kind ?? null,
        amount_compare: body.amount_compare ?? null,
        amount_value: toNumericString(body.amount_value),
        amount_value_max: toNumericString(body.amount_value_max),
        set_category_id: body.set_category_id ?? null,
        rename_merchant: body.rename_merchant?.trim() || null,
        created_at: new Date(),
        updated_at: new Date(),
        ruleAccounts: (body.account_ids ?? []).map((account_id) => ({
          rule_id: -1,
          account_id,
        })),
        ruleTags: (body.tag_ids ?? []).map((tag_id) => ({ rule_id: -1, tag_id })),
      };

      const { count, samples } = await previewRuleMatches(db, user.id, draft);
      return c.json(
        {
          count,
          samples: samples.map((sample) => ({
            id: sample.id,
            description: sample.description,
            amount: sample.amount,
            merchant_name: sample.merchant_name ?? null,
            category_id: sample.category_id ?? null,
          })),
        },
        200,
      );
    },
  )
  .put(
    "/:id",
    documented({
      tags: ["Rules"],
      summary: "Update rule",
      description: "Update an existing transaction rule",
      responses: {
        200: ruleResponseSchema,
        400: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
    }),
    validate("param", idParamSchema),
    validate("json", updateRuleSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const user = c.get("user");
      const db = c.get("db");

      const existing = await db.query.rule.findFirst({
        where: { id, user_id: user.id },
      });
      if (!existing) return jsonError(c, 404, "Rule not found");

      if (body.set_category_id != null) {
        const category = await db.query.category.findFirst({
          where: { id: body.set_category_id, user_id: user.id },
        });
        if (!category) return jsonError(c, 404, "Category not found");
      }

      if (body.tag_ids && !(await validateTagIds(db, user.id, body.tag_ids))) {
        return jsonError(c, 404, "One or more tags were not found");
      }

      if (body.account_ids) {
        for (const accountId of body.account_ids) {
          const account = await db.query.account.findFirst({
            where: { id: accountId, user_id: user.id },
          });
          if (!account) return jsonError(c, 404, "Account not found");
        }
      }

      await db
        .update(rule)
        .set({
          ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
          ...(body.position !== undefined ? { position: body.position } : {}),
          ...(body.payee_enabled !== undefined ? { payee_enabled: body.payee_enabled } : {}),
          ...(body.payee_match !== undefined ? { payee_match: body.payee_match } : {}),
          ...(body.payee_value !== undefined ? { payee_value: body.payee_value } : {}),
          ...(body.amount_enabled !== undefined ? { amount_enabled: body.amount_enabled } : {}),
          ...(body.amount_kind !== undefined ? { amount_kind: body.amount_kind } : {}),
          ...(body.amount_compare !== undefined ? { amount_compare: body.amount_compare } : {}),
          ...(body.amount_value !== undefined
            ? { amount_value: toNumericString(body.amount_value) }
            : {}),
          ...(body.amount_value_max !== undefined
            ? { amount_value_max: toNumericString(body.amount_value_max) }
            : {}),
          ...(body.set_category_id !== undefined ? { set_category_id: body.set_category_id } : {}),
          ...(body.rename_merchant !== undefined
            ? { rename_merchant: body.rename_merchant?.trim() || null }
            : {}),
          updated_at: new Date(),
        })
        .where(and(eq(rule.id, id), eq(rule.user_id, user.id)));

      if (body.account_ids) await replaceRuleAccounts(db, id, body.account_ids.slice(0, 1));
      if (body.tag_ids) await replaceRuleTags(db, id, body.tag_ids);

      const full = await db.query.rule.findFirst({
        where: { id, user_id: user.id },
        with: { ruleAccounts: true, ruleTags: true },
      });
      if (!full) return jsonError(c, 500, "Failed to load updated rule");
      return c.json(toRuleResponse(full as RuleWithRelations), 200);
    },
  )
  .post(
    "/:id/apply",
    documented({
      tags: ["Rules"],
      summary: "Apply rule to existing transactions",
      description:
        "Apply this rule to matching existing transactions. Locked attributes are not overwritten.",
      responses: {
        200: z.object({ updated: z.number() }),
        404: errorSchema,
      },
    }),
    validate("param", idParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const user = c.get("user");
      const db = c.get("db");

      const existing = await db.query.rule.findFirst({
        where: { id, user_id: user.id },
      });
      if (!existing) return jsonError(c, 404, "Rule not found");

      const result = await applyRuleToExisting(db, user.id, id);
      return c.json(result, 200);
    },
  )
  .delete(
    "/:id",
    documented({
      tags: ["Rules"],
      summary: "Delete rule",
      description: "Delete a transaction rule",
      responses: { 200: successSchema, 404: errorSchema },
    }),
    validate("param", idParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const user = c.get("user");
      const db = c.get("db");

      const existing = await db.query.rule.findFirst({
        where: { id, user_id: user.id },
      });
      if (!existing) return jsonError(c, 404, "Rule not found");

      await db.delete(rule).where(and(eq(rule.id, id), eq(rule.user_id, user.id)));
      return c.json({ success: true }, 200);
    },
  );
