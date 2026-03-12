import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { account } from "../db/schema/accounts";
import { transaction } from "../db/schema/transactions";
import { createDb } from "./db";
import { findOrCreateMerchant } from "./merchant-from-transaction";

const ENRICHMENT_MODEL = "workers-ai/@cf/nvidia/nemotron-3-120b-a12b";
const MAX_BATCH_SIZE = 20;

const enrichmentSchema = z.object({
  description: z.string(),
  categoryName: z.string(),
  merchantName: z.string(),
});

const enrichmentArraySchema = z.array(enrichmentSchema);

type EnrichmentResult = z.infer<typeof enrichmentSchema>;

export type EnrichmentEnv = {
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_AI_GATEWAY: string;
  CLOUDFLARE_AI_GATEWAY_TOKEN: string;
};

function parseJsonFromContent(content: string | unknown): unknown {
  if (typeof content !== "string") return content;
  const match = content.trim().match(/\[[\s\S]*\]|\{[\s\S]*\}/);
  try {
    return match ? (JSON.parse(match[0]) as unknown) : null;
  } catch {
    return null;
  }
}

/** Call gateway; returns parsed array of enrichment results (or null on parse failure). */
async function callEnrichmentModelBatch(
  prompt: string,
  env: EnrichmentEnv,
  expectedCount: number,
): Promise<EnrichmentResult[] | null> {
  const url = `https://gateway.ai.cloudflare.com/v1/${env.CLOUDFLARE_ACCOUNT_ID}/${env.CLOUDFLARE_AI_GATEWAY}/compat/chat/completions`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "cf-aig-authorization": `Bearer ${env.CLOUDFLARE_AI_GATEWAY_TOKEN}`,
      "cf-aig-zdr": "true",
    },
    body: JSON.stringify({
      model: ENRICHMENT_MODEL,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI Gateway ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string | unknown } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (content == null) return null;
  const raw = parseJsonFromContent(content);
  if (raw == null) return null;
  const parsed = enrichmentArraySchema.safeParse(raw);
  if (!parsed.success || parsed.data.length !== expectedCount) return null;
  return parsed.data;
}

export type EnrichmentOutcome = {
  transactionId: number;
  description: string;
  categoryName: string;
  merchantName: string;
  category_id: number | null;
  merchant_id: number | null;
};

/**
 * Enriches multiple transactions (same user) in one LLM call. Updates DB unless dryRun.
 * Splits into chunks of MAX_BATCH_SIZE if needed.
 */
export async function enrichTransactions(
  transactionIds: number[],
  env: EnrichmentEnv,
  options?: { dryRun?: boolean },
): Promise<EnrichmentOutcome[]> {
  if (transactionIds.length === 0) return [];
  const dryRun = options?.dryRun === true;
  const db = createDb();

  const rows = await db
    .select({ txn: transaction, user_id: account.user_id })
    .from(transaction)
    .innerJoin(account, eq(transaction.account_id, account.id))
    .where(inArray(transaction.id, transactionIds))
    .orderBy(transaction.id);

  const idToRow = new Map(rows.map((r) => [r.txn.id, r]));
  const ordered = transactionIds
    .map((id) => idToRow.get(id))
    .filter((r): r is (typeof rows)[number] => r != null);

  if (ordered.length === 0) {
    console.warn("[Transaction enrichment] no transactions found", { transactionIds });
    return [];
  }

  const userId = ordered[0]!.user_id;
  if (ordered.some((r) => r.user_id !== userId)) {
    console.warn("[Transaction enrichment] transactions must be for the same user");
    return [];
  }

  const [categories, merchants] = await Promise.all([
    db.query.category.findMany({
      where: { user_id: userId },
      columns: { id: true, name: true, classification: true },
      orderBy: (c, { asc }) => asc(c.name),
    }),
    db.query.merchant.findMany({
      where: { user_id: userId },
      columns: { id: true, name: true },
      orderBy: (m, { asc }) => asc(m.name),
    }),
  ]);

  const categoryList = categories.map((c) => `${c.name} (${c.classification})`).join(", ");
  const merchantList = merchants.map((m) => m.name).join(", ");

  const outcomes: EnrichmentOutcome[] = [];

  for (let i = 0; i < ordered.length; i += MAX_BATCH_SIZE) {
    const chunk = ordered.slice(i, i + MAX_BATCH_SIZE);
    const lines = chunk
      .map(
        (r, j) =>
          `[${j}] description: ${r.txn.description} | amount: ${String(r.txn.amount)} ${r.txn.currency} | date: ${typeof r.txn.timestamp === "string" ? r.txn.timestamp : (r.txn.timestamp?.toISOString?.() ?? "")}`,
      )
      .join("\n");

    const prompt = `You are a transaction enrichment assistant. For each bank transaction below, return a short human-readable description, a category from the user's list, and a merchant (from the list or a new concise name).

Transactions (one per line, index in brackets):
${lines}

User's categories (use exactly one of these names per transaction, or "Uncategorized"): ${categoryList || "Uncategorized"}

User's merchants (use one of these names or a new short merchant name per transaction): ${merchantList || "None"}

Respond with only a JSON array of ${chunk.length} objects, in the same order as the transactions (index 0 = first transaction). No other text. Each object: {"description":"...","categoryName":"...","merchantName":"..."}
- description: short, human-readable (e.g. "Coffee at Starbucks", "Salary")
- categoryName: exactly one of the category names above or "Uncategorized"
- merchantName: one of the merchant names above or a new concise name`;

    let results: EnrichmentResult[] | null = null;
    try {
      results = await callEnrichmentModelBatch(prompt, env, chunk.length);
    } catch (err) {
      console.error("[Transaction enrichment] LLM call failed", {
        transactionIds: chunk.map((r) => r.txn.id),
        err,
      });
      continue;
    }

    if (!results) {
      console.warn("[Transaction enrichment] could not parse or validate LLM response", {
        transactionIds: chunk.map((r) => r.txn.id),
      });
      continue;
    }

    for (let k = 0; k < chunk.length; k++) {
      const row = chunk[k]!;
      const txn = row.txn;
      const result = results[k];
      if (!result) continue;

      const description = result.description.trim().slice(0, 4096) || txn.description;
      const categoryName = result.categoryName.trim();
      const merchantName = result.merchantName.trim();

      let category_id: number | null = null;
      if (categoryName && categoryName.toLowerCase() !== "uncategorized") {
        const cat = categories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase());
        if (cat) category_id = cat.id;
      }

      let merchant_id: number | null = null;
      if (merchantName && !dryRun) {
        try {
          merchant_id = await findOrCreateMerchant(db, userId, merchantName);
        } catch (err) {
          console.error("[Transaction enrichment] findOrCreateMerchant failed", {
            transactionId: txn.id,
            merchantName,
            err,
          });
        }
      }

      outcomes.push({
        transactionId: txn.id,
        description,
        categoryName,
        merchantName,
        category_id,
        merchant_id,
      });

      if (!dryRun) {
        await db
          .update(transaction)
          .set({
            description,
            category_id,
            merchant_id,
            updated_at: new Date(),
          })
          .where(eq(transaction.id, txn.id));
      }

      if (!dryRun) {
        console.log("[Transaction enrichment] applied", {
          transactionId: txn.id,
          description: description.slice(0, 50),
          category_id,
          merchant_id,
        });
      }
    }
  }

  return outcomes;
}

/**
 * Single-transaction wrapper. Uses batch path with one id.
 */
export async function enrichTransaction(transactionId: number, env: EnrichmentEnv): Promise<void> {
  await enrichTransactions([transactionId], env);
}
