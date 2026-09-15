import { and, asc, eq, inArray } from "drizzle-orm";

import { merchant } from "../db/schema/merchants";
import { rule, ruleAccount, ruleTag } from "../db/schema/rules";
import { tag, transactionTag } from "../db/schema/tags";
import { transaction } from "../db/schema/transactions";
import type { Database } from "./db";
import { isFieldLocked } from "./locked-attributes";

export type RuleWithRelations = typeof rule.$inferSelect & {
  ruleAccounts: { account_id: number }[];
  ruleTags: { tag_id: number }[];
};

export type RuleMatchInput = {
  id: number;
  account_id: number;
  amount: string | number;
  description: string;
  merchant_id: number | null;
  merchant_name?: string | null;
  category_id: number | null;
  locked_attributes?: Record<string, boolean> | null;
};

export async function loadUserRules(db: Database, userId: string): Promise<RuleWithRelations[]> {
  const rows = await db.query.rule.findMany({
    where: { user_id: userId, enabled: true },
    orderBy: (r) => asc(r.position),
    with: {
      ruleAccounts: true,
      ruleTags: true,
    },
  });
  return rows as RuleWithRelations[];
}

export async function loadAllUserRules(db: Database, userId: string): Promise<RuleWithRelations[]> {
  const rows = await db.query.rule.findMany({
    where: { user_id: userId },
    orderBy: (r) => asc(r.position),
    with: {
      ruleAccounts: true,
      ruleTags: true,
    },
  });
  return rows as RuleWithRelations[];
}

function payeeText(input: RuleMatchInput): string {
  return `${input.merchant_name ?? ""} ${input.description ?? ""}`.toLowerCase();
}

export function ruleMatches(ruleRow: RuleWithRelations, input: RuleMatchInput): boolean {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount)) return false;

  let hasCondition = false;

  if (ruleRow.payee_enabled) {
    hasCondition = true;
    const value = (ruleRow.payee_value ?? "").trim().toLowerCase();
    if (!value) return false;
    const haystack = payeeText(input);
    if (ruleRow.payee_match === "exact") {
      const merchantName = (input.merchant_name ?? "").trim().toLowerCase();
      const description = (input.description ?? "").trim().toLowerCase();
      if (merchantName !== value && description !== value) return false;
    } else if (!haystack.includes(value)) {
      return false;
    }
  }

  if (ruleRow.amount_enabled) {
    hasCondition = true;
    const kind = ruleRow.amount_kind ?? "any";
    if (kind === "spending" && !(amount < 0)) return false;
    if (kind === "income" && !(amount > 0)) return false;

    const compare = ruleRow.amount_compare;
    if (compare) {
      const absAmount = Math.abs(amount);
      const value = Number(ruleRow.amount_value);
      const valueMax = Number(ruleRow.amount_value_max);
      if (compare === "lt") {
        if (!Number.isFinite(value) || !(absAmount < value)) return false;
      } else if (compare === "gt") {
        if (!Number.isFinite(value) || !(absAmount > value)) return false;
      } else if (compare === "between") {
        if (!Number.isFinite(value) || !Number.isFinite(valueMax)) return false;
        const min = Math.min(value, valueMax);
        const max = Math.max(value, valueMax);
        if (!(absAmount >= min && absAmount <= max)) return false;
      }
    }
  }

  if (ruleRow.ruleAccounts.length > 0) {
    hasCondition = true;
    if (!ruleRow.ruleAccounts.some((row) => row.account_id === input.account_id)) {
      return false;
    }
  }

  return hasCondition;
}

export type RuleApplicationResult = {
  categoryId: number | null;
  categoryFromRule: boolean;
  merchantName: string | null;
  tagIds: number[];
};

export function evaluateRules(
  rules: RuleWithRelations[],
  input: RuleMatchInput,
): RuleApplicationResult {
  let categoryId: number | null = null;
  let categoryFromRule = false;
  let merchantName: string | null = null;
  const tagIds = new Set<number>();

  for (const ruleRow of rules) {
    if (!ruleMatches(ruleRow, input)) continue;

    if (!categoryFromRule && ruleRow.set_category_id != null) {
      categoryId = ruleRow.set_category_id;
      categoryFromRule = true;
    }
    if (!merchantName && ruleRow.rename_merchant?.trim()) {
      merchantName = ruleRow.rename_merchant.trim();
    }
    for (const row of ruleRow.ruleTags) {
      tagIds.add(row.tag_id);
    }
  }

  return {
    categoryId,
    categoryFromRule,
    merchantName,
    tagIds: [...tagIds],
  };
}

async function ensureMerchantId(
  db: Database,
  userId: string,
  name: string,
): Promise<number | null> {
  const normalized = name.trim();
  if (!normalized) return null;

  const existing = await db.query.merchant.findFirst({
    where: { user_id: userId, name: normalized },
  });
  if (existing) return existing.id;

  const [created] = await db
    .insert(merchant)
    .values({
      user_id: userId,
      name: normalized,
    })
    .returning();
  return created?.id ?? null;
}

export async function applyRulesToTransaction(
  db: Database,
  userId: string,
  rules: RuleWithRelations[],
  input: RuleMatchInput,
  options?: { skipLocked?: boolean },
): Promise<{ applied: boolean; categoryFromRule: boolean }> {
  const result = evaluateRules(rules, input);
  if (!result.categoryFromRule && !result.merchantName && result.tagIds.length === 0) {
    return { applied: false, categoryFromRule: false };
  }

  const skipLocked = options?.skipLocked ?? true;
  const patch: {
    category_id?: number | null;
    merchant_id?: number | null;
    updated_at: Date;
  } = { updated_at: new Date() };

  let changed = false;

  if (
    result.categoryFromRule &&
    result.categoryId != null &&
    (!skipLocked || !isFieldLocked(input.locked_attributes, "category_id"))
  ) {
    patch.category_id = result.categoryId;
    changed = true;
  }

  if (
    result.merchantName &&
    (!skipLocked || !isFieldLocked(input.locked_attributes, "merchant_id"))
  ) {
    const merchantId = await ensureMerchantId(db, userId, result.merchantName);
    if (merchantId != null) {
      patch.merchant_id = merchantId;
      changed = true;
    }
  }

  if (changed) {
    await db.update(transaction).set(patch).where(eq(transaction.id, input.id));
  }

  if (result.tagIds.length > 0) {
    const existing = await db
      .select({ tag_id: transactionTag.tag_id })
      .from(transactionTag)
      .where(eq(transactionTag.transaction_id, input.id));
    const existingIds = new Set(existing.map((row) => row.tag_id));
    const toInsert = result.tagIds.filter((id) => !existingIds.has(id));
    if (toInsert.length > 0) {
      await db.insert(transactionTag).values(
        toInsert.map((tag_id) => ({
          transaction_id: input.id,
          tag_id,
        })),
      );
      changed = true;
    }
  }

  return { applied: changed, categoryFromRule: result.categoryFromRule };
}

export async function applyRulesToTransactions(
  db: Database,
  userId: string,
  transactionIds: number[],
): Promise<{ categorizedIds: number[] }> {
  if (!transactionIds.length) return { categorizedIds: [] };

  const rules = await loadUserRules(db, userId);
  if (!rules.length) return { categorizedIds: [] };

  const rows = await db.query.transaction.findMany({
    where: { id: { in: transactionIds } },
    with: {
      merchant: true,
    },
  });

  const categorizedIds: number[] = [];
  for (const row of rows) {
    const result = await applyRulesToTransaction(
      db,
      userId,
      rules,
      {
        id: row.id,
        account_id: row.account_id,
        amount: row.amount,
        description: row.description,
        merchant_id: row.merchant_id,
        merchant_name: row.merchant?.name ?? null,
        category_id: row.category_id,
        locked_attributes: row.locked_attributes,
      },
      { skipLocked: true },
    );
    if (result.categoryFromRule) categorizedIds.push(row.id);
  }

  return { categorizedIds };
}

export async function applyRulesToUncategorizedAccountTransactions(
  db: Database,
  userId: string,
  accountId: number,
): Promise<{ categorizedIds: number[] }> {
  const rows = await db.query.transaction.findMany({
    where: { account_id: accountId, category_id: { isNull: true } },
  });
  return applyRulesToTransactions(
    db,
    userId,
    rows.map((row) => row.id),
  );
}

export async function previewRuleMatches(
  db: Database,
  userId: string,
  ruleRow: RuleWithRelations,
  limit = 10,
): Promise<{ count: number; samples: RuleMatchInput[] }> {
  const accountFilter =
    ruleRow.ruleAccounts.length > 0
      ? { account_id: { in: ruleRow.ruleAccounts.map((row) => row.account_id) } }
      : {};

  const rows = await db.query.transaction.findMany({
    where: {
      account: { user_id: userId },
      ...accountFilter,
    },
    with: { merchant: true },
    orderBy: (t, { desc }) => desc(t.timestamp),
    limit: 500,
  });

  const samples: RuleMatchInput[] = [];
  let count = 0;
  for (const row of rows) {
    const input: RuleMatchInput = {
      id: row.id,
      account_id: row.account_id,
      amount: row.amount,
      description: row.description,
      merchant_id: row.merchant_id,
      merchant_name: row.merchant?.name ?? null,
      category_id: row.category_id,
      locked_attributes: row.locked_attributes,
    };
    if (!ruleMatches(ruleRow, input)) continue;
    count += 1;
    if (samples.length < limit) samples.push(input);
  }

  return { count, samples };
}

export async function applyRuleToExisting(
  db: Database,
  userId: string,
  ruleId: number,
): Promise<{ updated: number }> {
  const ruleRow = await db.query.rule.findFirst({
    where: { id: ruleId, user_id: userId },
    with: { ruleAccounts: true, ruleTags: true },
  });
  if (!ruleRow) return { updated: 0 };

  const accountFilter =
    ruleRow.ruleAccounts.length > 0
      ? { account_id: { in: ruleRow.ruleAccounts.map((row) => row.account_id) } }
      : {};

  const rows = await db.query.transaction.findMany({
    where: {
      account: { user_id: userId },
      ...accountFilter,
    },
    with: { merchant: true },
  });

  let updated = 0;
  for (const row of rows) {
    const input: RuleMatchInput = {
      id: row.id,
      account_id: row.account_id,
      amount: row.amount,
      description: row.description,
      merchant_id: row.merchant_id,
      merchant_name: row.merchant?.name ?? null,
      category_id: row.category_id,
      locked_attributes: row.locked_attributes,
    };
    if (!ruleMatches(ruleRow as RuleWithRelations, input)) continue;
    const result = await applyRulesToTransaction(
      db,
      userId,
      [ruleRow as RuleWithRelations],
      input,
      { skipLocked: true },
    );
    if (result.applied) updated += 1;
  }

  return { updated };
}

export async function replaceRuleAccounts(
  db: Database,
  ruleId: number,
  accountIds: number[],
): Promise<void> {
  await db.delete(ruleAccount).where(eq(ruleAccount.rule_id, ruleId));
  if (accountIds.length === 0) return;
  await db
    .insert(ruleAccount)
    .values(accountIds.map((account_id) => ({ rule_id: ruleId, account_id })));
}

export async function replaceRuleTags(
  db: Database,
  ruleId: number,
  tagIds: number[],
): Promise<void> {
  await db.delete(ruleTag).where(eq(ruleTag.rule_id, ruleId));
  if (tagIds.length === 0) return;
  await db.insert(ruleTag).values(tagIds.map((tag_id) => ({ rule_id: ruleId, tag_id })));
}

export async function validateTagIds(
  db: Database,
  userId: string,
  tagIds: number[],
): Promise<boolean> {
  if (tagIds.length === 0) return true;
  const rows = await db
    .select({ id: tag.id })
    .from(tag)
    .where(and(eq(tag.user_id, userId), inArray(tag.id, tagIds)));
  return rows.length === tagIds.length;
}

export async function setTransactionTags(
  db: Database,
  transactionId: number,
  tagIds: number[],
): Promise<void> {
  await db.delete(transactionTag).where(eq(transactionTag.transaction_id, transactionId));
  if (tagIds.length === 0) return;
  await db
    .insert(transactionTag)
    .values(tagIds.map((tag_id) => ({ transaction_id: transactionId, tag_id })));
}
