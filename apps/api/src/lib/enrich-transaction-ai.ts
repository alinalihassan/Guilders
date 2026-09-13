import { Output, generateText } from "ai";
import { env } from "cloudflare:workers";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { category } from "../db/schema/categories";
import { merchant } from "../db/schema/merchants";
import { transaction } from "../db/schema/transactions";
import type { TransactionEnrichmentEvent } from "../queues/types";
import { AI_GATEWAY_HEADERS, GEMINI_FLASH_MODEL, createGuildersAI } from "./ai";
import type { Database } from "./db";
import { websiteToLogoUrl } from "./enrich-transaction";

const CLASSIFY_BATCH = 25;

const classificationSchema = z.object({
  items: z.array(
    z.object({
      key: z.string(),
      name: z.string().min(1).max(255),
      website: z.string().nullable(),
      category_id: z.number().int(),
    }),
  ),
});

export function fallbackCategoryId(
  categories: { id: number; name: string; classification: string }[],
  isIncome: boolean,
): number | null {
  if (!categories.length) return null;
  const wanted = isIncome ? "income" : "expense";
  const pool = categories.filter((item) => item.classification === wanted);
  const other = pool.find((item) => /^other\b/i.test(item.name));
  return (other ?? pool[0] ?? categories[0])?.id ?? null;
}

export async function enqueueAccountEnrichment(userId: string, accountId: number): Promise<void> {
  const event: TransactionEnrichmentEvent = {
    source: "transaction-enrichment",
    eventType: "enrich-account",
    payload: { userId, accountId },
  };
  await env.WEBHOOK_QUEUE.send(event);
}

export async function enrichAccountMerchantsWithAi(
  db: Database,
  userId: string,
  accountId: number,
): Promise<{ classified: number; remaining: boolean }> {
  const categories = await db
    .select({
      id: category.id,
      name: category.name,
      classification: category.classification,
    })
    .from(category)
    .where(eq(category.user_id, userId));

  if (!categories.length) return { classified: 0, remaining: false };

  const categoryIds = new Set(categories.map((item) => item.id));
  const pendingRows = await db
    .select({
      merchantId: merchant.id,
      merchantName: merchant.name,
      description: transaction.description,
      amount: transaction.amount,
    })
    .from(transaction)
    .innerJoin(merchant, eq(transaction.merchant_id, merchant.id))
    .where(
      and(
        eq(transaction.account_id, accountId),
        eq(merchant.user_id, userId),
        isNull(merchant.website_url),
      ),
    );

  const pendingByMerchant = new Map<
    number,
    { name: string; description: string; isIncome: boolean }
  >();
  for (const row of pendingRows) {
    if (pendingByMerchant.has(row.merchantId)) continue;
    pendingByMerchant.set(row.merchantId, {
      name: row.merchantName,
      description: row.description,
      isIncome: Number(row.amount) > 0,
    });
  }

  const batch = [...pendingByMerchant.entries()].slice(0, CLASSIFY_BATCH);
  if (!batch.length) return { classified: 0, remaining: false };

  const classified = await classifyMerchants({
    categories,
    merchants: batch.map(([id, item]) => ({
      key: String(id),
      name: item.name,
      description: item.description,
      isIncome: item.isIncome,
    })),
  });

  const now = new Date();
  let applied = 0;

  for (const [merchantId, item] of batch) {
    const result = classified.get(String(merchantId));
    const categoryId = resolveCategoryId(
      result?.category_id,
      categoryIds,
      categories,
      item.isIncome,
    );
    const displayName = sanitizeMerchantName(result?.name) ?? item.name;
    const website = normalizeWebsite(result?.website);
    const targetMerchantId = await upsertClassifiedMerchant(db, {
      userId,
      merchantId,
      currentName: item.name,
      displayName,
      website,
      now,
    });

    if (categoryId != null) {
      await db
        .update(transaction)
        .set({ category_id: categoryId, updated_at: now })
        .where(
          and(
            eq(transaction.account_id, accountId),
            eq(transaction.merchant_id, targetMerchantId),
            isNull(transaction.category_id),
          ),
        );
    }
    applied += 1;
  }

  return { classified: applied, remaining: pendingByMerchant.size > batch.length };
}

async function classifyMerchants(input: {
  categories: { id: number; name: string; classification: string }[];
  merchants: { key: string; name: string; description: string; isIncome: boolean }[];
}): Promise<Map<string, z.infer<typeof classificationSchema>["items"][number]>> {
  const ai = createGuildersAI();
  const categoryLines = input.categories
    .map((item) => `- ${item.id}: ${item.name} (${item.classification})`)
    .join("\n");
  const merchantLines = input.merchants
    .map((item) => {
      const direction = item.isIncome ? "incoming" : "outgoing";
      return `- key=${item.key}; name=${JSON.stringify(item.name)}; description=${JSON.stringify(item.description)}; direction=${direction}`;
    })
    .join("\n");

  const { output } = await generateText({
    model: ai(GEMINI_FLASH_MODEL),
    output: Output.object({
      schema: classificationSchema,
      name: "merchant_classification",
      description: "Cleaned merchants mapped onto the user's category ids",
    }),
    headers: AI_GATEWAY_HEADERS,
    instructions: `You classify bank transactions for a personal finance app.
Pick exactly one category_id from the user's categories for each merchant. Never invent ids.
Prefer income categories for incoming amounts and expense categories for outgoing amounts.
Return a short official merchant display name (not the raw card string) and the merchant website if you know it.`,
    prompt: `User categories:\n${categoryLines}\n\nMerchants:\n${merchantLines}`,
  });

  if (!output?.items.length) {
    throw new Error("Gemini returned no merchant classifications");
  }

  const results = new Map<string, z.infer<typeof classificationSchema>["items"][number]>();
  for (const item of output.items) {
    results.set(item.key, item);
  }
  return results;
}

function resolveCategoryId(
  rawId: number | undefined,
  categoryIds: Set<number>,
  categories: { id: number; name: string; classification: string }[],
  isIncome: boolean,
): number | null {
  if (rawId != null && categoryIds.has(rawId)) return rawId;
  return fallbackCategoryId(categories, isIncome);
}

function sanitizeMerchantName(name: string | undefined): string | null {
  const trimmed = name?.replace(/\s+/g, " ").trim();
  if (!trimmed || trimmed.length > 255) return null;
  return trimmed;
}

function normalizeWebsite(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const url = trimmed.includes("://") ? new URL(trimmed) : new URL(`https://${trimmed}`);
    if (!url.hostname || url.hostname.length > 253) return "";
    return `https://${url.hostname}`;
  } catch {
    return "";
  }
}

async function upsertClassifiedMerchant(
  db: Database,
  input: {
    userId: string;
    merchantId: number;
    currentName: string;
    displayName: string;
    website: string;
    now: Date;
  },
): Promise<number> {
  const logoUrl = websiteToLogoUrl(input.website);
  const patch = {
    logo_url: logoUrl,
    website_url: input.website,
    updated_at: input.now,
  };

  if (input.displayName === input.currentName) {
    await db.update(merchant).set(patch).where(eq(merchant.id, input.merchantId));
    return input.merchantId;
  }

  const existing = await db.query.merchant.findFirst({
    where: { user_id: input.userId, name: input.displayName },
  });

  if (existing && existing.id !== input.merchantId) {
    await db
      .update(transaction)
      .set({ merchant_id: existing.id, updated_at: input.now })
      .where(eq(transaction.merchant_id, input.merchantId));
    await db
      .update(merchant)
      .set({
        logo_url: existing.logo_url ?? logoUrl,
        website_url: existing.website_url || input.website,
        updated_at: input.now,
      })
      .where(eq(merchant.id, existing.id));
    await db.delete(merchant).where(eq(merchant.id, input.merchantId));
    return existing.id;
  }

  await db
    .update(merchant)
    .set({ ...patch, name: input.displayName })
    .where(eq(merchant.id, input.merchantId));
  return input.merchantId;
}
