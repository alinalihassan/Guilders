import { and, eq, inArray, isNotNull } from "drizzle-orm";

import { merchant } from "../db/schema/merchants";
import { transaction } from "../db/schema/transactions";
import type { InsertTransaction } from "../db/schema/transactions";
import type { ProviderTransaction } from "../providers/types";
import { seedDefaultCategoriesForUser } from "./categories";
import type { Database } from "./db";
import { SYNCED_TRANSACTION_LOCKED_ATTRIBUTES } from "./locked-attributes";
import { isDateOnlyUtcTimestamp, toUtcNoon } from "./provider-timestamp";

export type ProviderTransactionHint = {
  provider_transaction_id?: string | null;
  merchant_name?: string | null;
  provider_category?: string | null;
  description?: string | null;
  amount?: string | number | null;
};

const GENERIC_MERCHANT_NAMES = new Set([
  "transaction",
  "payment",
  "transfer",
  "atm",
  "unknown",
  "deposit",
  "withdrawal",
  "card payment",
  "bank transfer",
  "internal",
  "interne overboeking",
  "fee",
  "interest",
]);

const PROCESSOR_PREFIX = /^(sumup|ccv|adyen|mollie|stripe|square|paypal|ubr|tikkie|bck)\s*\*?\s*/i;
const VIA_PROCESSOR = /\s+via\s+(mollie|adyen|stripe|paypal|ing betaalverzoek|rabo smart pay).*$/i;
const CARD_REF = /\s*\*{2,}\d+\*?$/;
const STORE_NUMBER = /\s+\d{3,5}$/;
const DOMAIN_ONLY =
  /^([a-z0-9-]+)\.(com|net|org|io|app|me|eu|nl|de|fr|be|uk|co|info)(?:\/[^\s]*)?$/i;
export function toInsertTransaction(txn: ProviderTransaction): InsertTransaction {
  const { merchant_name: _merchantName, provider_category: _providerCategory, ...row } = txn;
  return row;
}

export function normalizeMerchantName(raw: string | null | undefined): string | null {
  return resolveMerchant(raw)?.name ?? null;
}

export function websiteToLogoUrl(website: string | null | undefined): string | null {
  if (!website) return null;
  try {
    const url = website.includes("://") ? new URL(website) : new URL(`https://${website}`);
    if (!url.hostname) return null;
    return `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(url.hostname)}`;
  } catch {
    return null;
  }
}

export async function enrichSyncedAccountTransactions(
  db: Database,
  userId: string,
  accountId: number,
  hints: ProviderTransactionHint[] = [],
): Promise<void> {
  const rows = await db
    .select({
      id: transaction.id,
      provider_transaction_id: transaction.provider_transaction_id,
      merchant_id: transaction.merchant_id,
      category_id: transaction.category_id,
      description: transaction.description,
      timestamp: transaction.timestamp,
      locked_attributes: transaction.locked_attributes,
    })
    .from(transaction)
    .where(eq(transaction.account_id, accountId));

  if (!rows.length) return;

  await seedDefaultCategoriesForUser(db, userId);

  const hintByProviderId = new Map<string, ProviderTransactionHint>();
  for (const hint of hints) {
    if (hint.provider_transaction_id) {
      hintByProviderId.set(hint.provider_transaction_id, hint);
    }
  }

  const planned = rows.map((row) => {
    const hint = row.provider_transaction_id
      ? hintByProviderId.get(row.provider_transaction_id)
      : undefined;
    const sourceName = hint?.merchant_name || hint?.description || row.description;
    const resolved = resolveMerchant(sourceName);
    const nextTimestamp =
      isDateOnlyUtcTimestamp(row.timestamp) && row.timestamp.getUTCHours() === 0
        ? toUtcNoon(row.timestamp)
        : row.timestamp;

    return {
      id: row.id,
      merchantName: row.merchant_id == null ? (resolved?.name ?? null) : null,
      merchantDomain: resolved?.domain ?? null,
      timestamp: nextTimestamp.getTime() === row.timestamp.getTime() ? null : nextTimestamp,
      unlockLocks: row.locked_attributes?.category_id === true,
      needsCategory: row.category_id == null,
    };
  });

  const namesToEnsure = [
    ...new Set(
      planned.map((item) => item.merchantName).filter((name): name is string => Boolean(name)),
    ),
  ];

  if (namesToEnsure.length) {
    const existingMerchants = await db
      .select({ id: merchant.id, name: merchant.name, logo_url: merchant.logo_url })
      .from(merchant)
      .where(eq(merchant.user_id, userId));
    const existingByName = new Map(existingMerchants.map((item) => [item.name, item]));
    const now = new Date();
    const toInsert = namesToEnsure
      .filter((name) => !existingByName.has(name))
      .map((name) => {
        const domain = planned.find((item) => item.merchantName === name)?.merchantDomain ?? null;
        return {
          user_id: userId,
          name,
          logo_url: websiteToLogoUrl(domain),
          created_at: now,
          updated_at: now,
        };
      });

    if (toInsert.length) {
      await db.insert(merchant).values(toInsert).onConflictDoNothing();
    }
  }

  const [merchants, categorizedRows] = await Promise.all([
    db
      .select({
        id: merchant.id,
        name: merchant.name,
        website_url: merchant.website_url,
      })
      .from(merchant)
      .where(eq(merchant.user_id, userId)),
    db
      .select({
        merchant_id: transaction.merchant_id,
        category_id: transaction.category_id,
      })
      .from(transaction)
      .where(
        and(
          eq(transaction.account_id, accountId),
          isNotNull(transaction.merchant_id),
          isNotNull(transaction.category_id),
        ),
      ),
  ]);

  const merchantIdByName = new Map(merchants.map((item) => [item.name, item.id]));
  const knownMerchantIds = new Set(
    merchants.filter((item) => item.website_url != null).map((item) => item.id),
  );
  const categoryByMerchantId = new Map<number, number>();
  for (const row of categorizedRows) {
    if (row.merchant_id == null || row.category_id == null) continue;
    if (!categoryByMerchantId.has(row.merchant_id)) {
      categoryByMerchantId.set(row.merchant_id, row.category_id);
    }
  }

  const groups = new Map<
    string,
    {
      ids: number[];
      merchant_id?: number;
      category_id?: number;
      timestamp?: Date;
      unlockLocks: boolean;
    }
  >();

  for (const item of planned) {
    const merchantId = item.merchantName ? merchantIdByName.get(item.merchantName) : undefined;
    const reusedCategory =
      item.needsCategory && merchantId != null && knownMerchantIds.has(merchantId)
        ? categoryByMerchantId.get(merchantId)
        : undefined;
    if (!merchantId && !reusedCategory && !item.timestamp && !item.unlockLocks) continue;

    const key = `${merchantId ?? "n"}:${reusedCategory ?? "n"}:${item.timestamp?.toISOString() ?? "n"}:${item.unlockLocks}`;
    const group = groups.get(key) ?? {
      ids: [],
      merchant_id: merchantId,
      category_id: reusedCategory,
      timestamp: item.timestamp ?? undefined,
      unlockLocks: item.unlockLocks,
    };
    group.ids.push(item.id);
    groups.set(key, group);
  }

  const now = new Date();
  for (const group of groups.values()) {
    const patch: {
      merchant_id?: number;
      category_id?: number;
      timestamp?: Date;
      locked_attributes?: typeof SYNCED_TRANSACTION_LOCKED_ATTRIBUTES;
      updated_at: Date;
    } = { updated_at: now };
    if (group.merchant_id != null) patch.merchant_id = group.merchant_id;
    if (group.category_id != null) patch.category_id = group.category_id;
    if (group.timestamp) patch.timestamp = group.timestamp;
    if (group.unlockLocks) patch.locked_attributes = SYNCED_TRANSACTION_LOCKED_ATTRIBUTES;

    await db.update(transaction).set(patch).where(inArray(transaction.id, group.ids));
  }
}

function resolveMerchant(
  raw: string | null | undefined,
): { name: string; domain: string | null } | null {
  if (!raw) return null;
  let cleaned = raw.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;

  cleaned = cleaned
    .replace(/\bPENDING\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  cleaned = cleaned.replace(PROCESSOR_PREFIX, "").trim();
  cleaned = cleaned.replace(VIA_PROCESSOR, "").trim();
  cleaned = cleaned.replace(CARD_REF, "").trim();
  cleaned = cleaned.replace(/\/bill$/i, "").trim();

  if (!cleaned || GENERIC_MERCHANT_NAMES.has(cleaned.toLowerCase())) return null;

  const domainMatch = cleaned.match(DOMAIN_ONLY);
  if (domainMatch) {
    return {
      name: titleCaseMerchant(domainMatch[1]!.replace(/-/g, " ")),
      domain: `${domainMatch[1]}.${domainMatch[2]}`.toLowerCase(),
    };
  }

  cleaned = cleaned.replace(STORE_NUMBER, "").trim();
  if (!cleaned || GENERIC_MERCHANT_NAMES.has(cleaned.toLowerCase())) return null;

  const name = titleCaseMerchant(cleaned);
  if (name.length < 2 || name.length > 255) return null;

  return { name, domain: null };
}

function titleCaseMerchant(value: string): string {
  return value
    .toLowerCase()
    .replace(/[a-z0-9]+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1));
}
