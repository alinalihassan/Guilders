import { Output, generateText } from "ai";
import { env } from "cloudflare:workers";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { category } from "../db/schema/categories";
import { merchant } from "../db/schema/merchants";
import { transaction } from "../db/schema/transactions";
import type { TransactionEnrichmentEvent } from "../queues/types";
import { AI_GATEWAY_HEADERS, GEMINI_FLASH_MODEL, createGuildersAI } from "./ai";
import { seedDefaultCategoriesForUser } from "./categories";
import type { Database } from "./db";
import { websiteToLogoUrl } from "./enrich-transaction";
import { isFieldLocked } from "./locked-attributes";

const CLASSIFY_BATCH = 20;
const BATCHES_PER_INVOCATION = 6;

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

type CategoryRow = { id: number; name: string; classification: string };

type TransactionGroup = {
  key: string;
  merchantId: number | null;
  merchantName: string;
  isIncome: boolean;
  kind: string;
  samples: { description: string; amount: number }[];
  transactionIds: number[];
  latestTimestamp: number;
};

export function isOtherCategoryName(name: string | null | undefined): boolean {
  return !!name && /^other\b/i.test(name.trim());
}

export function transactionKind(description: string, amount: number): string {
  const text = description.toLowerCase();
  if (/\b(wage|salary|payroll|loon|salaris)\b/.test(text)) return "salary";
  if (/\b(sent from revolut|interne overboeking|from your .+ account)\b/.test(text)) return "xfer";
  if (/\b(tikkie|betaalverzoek)\b/.test(text)) return "p2p";
  if (/\b(won back|cashback|cash back)\b/.test(text)) return "cashback";
  if (/\brefund\b/.test(text)) return "refund";
  if (/\b(membership|subscr|prime renewal|\/bill|abonnement)\b/.test(text)) return "sub";
  return Math.abs(amount) >= 500 ? "large" : "std";
}

export function transactionGroupKey(input: {
  merchantId: number | null;
  description: string;
  amount: number;
}): string {
  const direction = input.amount > 0 ? "in" : "out";
  const kind = transactionKind(input.description, input.amount);
  if (input.merchantId != null) return `m:${input.merchantId}:${direction}:${kind}`;
  return `d:${input.description.trim().toLowerCase().slice(0, 80)}:${direction}:${kind}`;
}

export function fallbackCategoryId(categories: CategoryRow[], isIncome: boolean): number | null {
  if (!categories.length) return null;
  const wanted = isIncome ? "income" : "expense";
  const pool = categories.filter((item) => item.classification === wanted);
  const other = pool.find((item) => isOtherCategoryName(item.name));
  return (other ?? pool[0] ?? categories[0])?.id ?? null;
}

export function coerceCategoryId(
  rawId: number | undefined,
  categoryIds: Set<number>,
  categories: CategoryRow[],
  isIncome: boolean,
  kind?: string,
): number | null {
  if (rawId != null && categoryIds.has(rawId)) {
    const match = categories.find((item) => item.id === rawId);
    const wanted = isIncome ? "income" : "expense";
    if (match?.classification === wanted) return rawId;
    // Incoming card cashback is stored on the original expense category (Talvo-style).
    if (isIncome && kind === "cashback" && match?.classification === "expense") return rawId;
  }
  return fallbackCategoryId(categories, isIncome);
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
  await seedDefaultCategoriesForUser(db, userId);

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
  const pendingGroups = await loadPendingGroups(db, userId, accountId);
  if (!pendingGroups.length) return { classified: 0, remaining: false };

  let classified = 0;
  let offset = 0;
  for (let i = 0; i < BATCHES_PER_INVOCATION && offset < pendingGroups.length; i += 1) {
    const batch = pendingGroups.slice(offset, offset + CLASSIFY_BATCH);
    offset += batch.length;
    try {
      classified += await classifyAndApplyBatch(db, {
        userId,
        accountId,
        categories,
        categoryIds,
        batch,
      });
    } catch (error) {
      console.error("[enrich] batch failed", {
        userId,
        accountId,
        batchSize: batch.length,
        error,
      });
    }
  }

  return { classified, remaining: offset < pendingGroups.length };
}

async function loadPendingGroups(
  db: Database,
  userId: string,
  accountId: number,
): Promise<TransactionGroup[]> {
  const rows = await db
    .select({
      transactionId: transaction.id,
      merchantId: merchant.id,
      merchantName: merchant.name,
      websiteUrl: merchant.website_url,
      description: transaction.description,
      amount: transaction.amount,
      categoryId: transaction.category_id,
      categoryName: category.name,
      lockedAttributes: transaction.locked_attributes,
      timestamp: transaction.timestamp,
    })
    .from(transaction)
    .leftJoin(merchant, eq(transaction.merchant_id, merchant.id))
    .leftJoin(category, eq(transaction.category_id, category.id))
    .where(and(eq(transaction.account_id, accountId)));

  const groups = new Map<string, TransactionGroup>();
  const pendingKeys = new Set<string>();

  for (const row of rows) {
    const amount = Number(row.amount);
    const merchantId = row.merchantId ?? null;
    const categoryLocked = isFieldLocked(row.lockedAttributes, "category_id");
    const kind = transactionKind(row.description, amount);
    const key = transactionGroupKey({
      merchantId,
      description: row.description,
      amount,
    });
    const group = groups.get(key) ?? {
      key,
      merchantId,
      merchantName: row.merchantName?.trim() || row.description,
      isIncome: amount > 0,
      kind,
      samples: [],
      transactionIds: [],
      latestTimestamp: 0,
    };
    if (!categoryLocked) {
      group.transactionIds.push(row.transactionId);
    }
    if (group.samples.length < 3) {
      group.samples.push({ description: row.description, amount });
    }
    group.latestTimestamp = Math.max(group.latestTimestamp, row.timestamp.getTime());
    groups.set(key, group);

    const unseenMerchant = merchantId != null && row.websiteUrl == null;
    const uncategorized = row.categoryId == null || isOtherCategoryName(row.categoryName);
    if (unseenMerchant || (uncategorized && !categoryLocked)) {
      pendingKeys.add(key);
    }
  }

  return [...groups.values()]
    .filter((group) => pendingKeys.has(group.key))
    .sort((left, right) => right.latestTimestamp - left.latestTimestamp);
}

async function classifyAndApplyBatch(
  db: Database,
  input: {
    userId: string;
    accountId: number;
    categories: CategoryRow[];
    categoryIds: Set<number>;
    batch: TransactionGroup[];
  },
): Promise<number> {
  const classified = await classifyTransactionGroups({
    categories: input.categories,
    groups: input.batch,
  });

  const now = new Date();
  const merchantUpdates = new Map<
    number,
    { currentName: string; displayName: string; website: string }
  >();

  for (const group of input.batch) {
    const result = classified.get(group.key);
    const categoryId = coerceCategoryId(
      result?.category_id,
      input.categoryIds,
      input.categories,
      group.isIncome,
      group.kind,
    );
    if (categoryId != null && group.transactionIds.length) {
      await db
        .update(transaction)
        .set({ category_id: categoryId, updated_at: now })
        .where(
          and(
            eq(transaction.account_id, input.accountId),
            inArray(transaction.id, group.transactionIds),
          ),
        );
    }

    if (group.merchantId != null) {
      merchantUpdates.set(group.merchantId, {
        currentName: group.merchantName,
        displayName: group.merchantName,
        website: normalizeWebsite(result?.website),
      });
    }
  }

  for (const [merchantId, update] of merchantUpdates) {
    await upsertClassifiedMerchant(db, {
      userId: input.userId,
      merchantId,
      currentName: update.currentName,
      displayName: update.displayName,
      website: update.website,
      now,
    });
  }

  return input.batch.length;
}

const CLASSIFIER_INSTRUCTIONS = `You classify personal bank transactions. Pick exactly one category_id from the user's list. Never invent ids.
Outgoing amounts must use expense categories. Incoming amounts must use income categories.
Return a short official merchant display name (not the raw card string) and the merchant website if you know it.
Read the remittance/description, not just the merchant name. The same personal name can be a P2P split, an own-account transfer, cashback, or a refund.

Use a specific category when the merchant or description is recognizable. If you cannot identify an outgoing merchant, use Other Expenses — do not guess Drinks & Dining.

Policy:
1. Groceries: supermarkets, convenience stores, grocery delivery, bakeries, and grocery retail. Grocery-delivery memberships stay Groceries, not Subscriptions.
2. Drinks & Dining: restaurants, cafes, fast food, bars, and snack counters. Not bakeries or grocery retail. A single unknown proper name plus a city is Other Expenses, not dining.
3. Transport: fuel, EV charging, parking, tolls, public transit, and rail. Ride-hailing trips are Transport. Ride-hailing memberships are Subscriptions.
4. Subscriptions: software, streaming, cloud, domain-like SaaS, and bank plan fees. Incoming card cashback from a bank plan ("won back", "cashback") is Subscriptions, not Other Income.
5. Healthcare vs Insurance: pharmacies, doctors, medical bills, and basic health-insurance premiums plus excess (eigen risico) are Healthcare. Car, home, liability, and mobility cover are Insurance.
6. Utilities vs Taxes: water, energy, internet, and mobile are Utilities. Water-board assessments (waterschap / AGV) are Utilities. Municipal tax bills (gemeente aanslagbiljet) are Taxes.
7. Rent & Mortgage: rent, mortgage, or housing paid via a landlord or housing/pension foundation.
8. Transfers vs Salary: own-account moves only when the description says so (for example "Sent from …"). Wages need "Wage", "Salary", or a large regular incoming payroll amount. A personal name alone is not a transfer.
9. Education vs Financial: tuition and student-loan installments are Childcare & Education. Consumer loans and credit payments are Financial.
10. Other: P2P payment requests, unknown merchants, refunds/credits that are not clearly the original category, and unnamed personal-name incoming. Shopping, Entertainment, Travel, Investments, Fitness, Pets, Household, Personal Care, and Hobbies only when the description clearly matches.

Never put a supermarket, insurer, utility, parking/toll, pharmacy, or well-known SaaS charge in Other.`;

async function classifyTransactionGroups(input: {
  categories: CategoryRow[];
  groups: TransactionGroup[];
}): Promise<Map<string, z.infer<typeof classificationSchema>["items"][number]>> {
  const categoryLines = input.categories
    .map((item) => `- ${item.id}: ${item.name} (${item.classification})`)
    .join("\n");
  const groupLines = input.groups
    .map((group) => {
      const direction = group.isIncome ? "incoming" : "outgoing";
      const samples = group.samples
        .map((sample) => `${JSON.stringify(sample.description)} (${sample.amount})`)
        .join("; ");
      return `- key=${group.key}; merchant=${JSON.stringify(group.merchantName)}; direction=${direction}; samples=${samples}`;
    })
    .join("\n");
  const prompt = `User categories:\n${categoryLines}\n\nTransactions:\n${groupLines}`;

  try {
    return parseClassificationItems(await classifyStructured(prompt));
  } catch (error) {
    console.error("[enrich] structured classification failed, retrying as JSON text", error);
    return parseClassificationItems(await classifyAsJsonText(prompt));
  }
}

async function classifyStructured(
  prompt: string,
): Promise<z.infer<typeof classificationSchema>["items"]> {
  const ai = createGuildersAI();
  const { output } = await generateText({
    model: ai(GEMINI_FLASH_MODEL),
    output: Output.object({
      schema: classificationSchema,
      name: "merchant_classification",
      description: "Cleaned merchants mapped onto the user's category ids",
    }),
    headers: AI_GATEWAY_HEADERS,
    instructions: CLASSIFIER_INSTRUCTIONS,
    prompt,
  });
  if (!output?.items.length) {
    throw new Error("Gemini returned no merchant classifications");
  }
  return output.items;
}

async function classifyAsJsonText(
  prompt: string,
): Promise<z.infer<typeof classificationSchema>["items"]> {
  const ai = createGuildersAI();
  const { text } = await generateText({
    model: ai(GEMINI_FLASH_MODEL),
    headers: AI_GATEWAY_HEADERS,
    instructions: `${CLASSIFIER_INSTRUCTIONS}

Return only JSON of the form {"items":[{"key":"...","name":"...","website":null,"category_id":123}]}.`,
    prompt,
  });
  const json = extractJsonObject(text);
  const parsed = classificationSchema.safeParse(json);
  if (!parsed.success || !parsed.data.items.length) {
    throw new Error("Gemini JSON text returned no merchant classifications");
  }
  return parsed.data.items;
}

function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced?.[1] ?? text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("Gemini response did not contain a JSON object");
  }
  return JSON.parse(raw.slice(start, end + 1));
}

function parseClassificationItems(
  items: z.infer<typeof classificationSchema>["items"],
): Map<string, z.infer<typeof classificationSchema>["items"][number]> {
  const results = new Map<string, z.infer<typeof classificationSchema>["items"][number]>();
  for (const item of items) {
    results.set(item.key, item);
  }
  return results;
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
