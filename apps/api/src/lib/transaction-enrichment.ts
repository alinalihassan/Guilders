import { eq } from "drizzle-orm";
import { z } from "zod";

import { transaction } from "../db/schema/transactions";
import { createDb } from "./db";
import { findOrCreateMerchant } from "./merchant-from-transaction";

const ENRICHMENT_MODEL = "workers-ai/@cf/meta/llama-4-scout-17b-16e-instruct";

const enrichmentSchema = z.object({
  description: z.string(),
  categoryName: z.string(),
  merchantName: z.string(),
});

type EnrichmentResult = z.infer<typeof enrichmentSchema>;

type EnrichmentEnv = {
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_AI_GATEWAY: string;
  CLOUDFLARE_AI_GATEWAY_TOKEN: string;
};

/** Call gateway directly; Cloudflare returns message.content as object, which the AI SDK rejects. */
async function callEnrichmentModel(
  prompt: string,
  env: EnrichmentEnv,
): Promise<EnrichmentResult | null> {
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
    choices?: Array<{ message?: { content?: string | EnrichmentResult } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (content == null) return null;
  const raw =
    typeof content === "string"
      ? (() => {
          const match = content.trim().match(/\{[\s\S]*\}/);
          try {
            return match ? (JSON.parse(match[0]) as unknown) : null;
          } catch {
            return null;
          }
        })()
      : content;
  const parsed = enrichmentSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/**
 * Loads a transaction with account, then uses an LLM to produce an enriched
 * description, category (from user's categories), and merchant (from list or new).
 * Updates the transaction via direct DB update (bypasses locked-attributes).
 */
export async function enrichTransaction(transactionId: number, env: EnrichmentEnv): Promise<void> {
  const db = createDb();

  const txn = await db.query.transaction.findFirst({
    where: { id: transactionId },
    with: { account: true },
  });
  if (!txn?.account) {
    console.warn("[Transaction enrichment] transaction or account not found", { transactionId });
    return;
  }

  const userId = txn.account.user_id;

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
  const amount = String(txn.amount);
  const timestamp =
    typeof txn.timestamp === "string" ? txn.timestamp : (txn.timestamp?.toISOString?.() ?? "");

  const prompt = `You are a transaction enrichment assistant. Given a bank transaction, return a short human-readable description, a category from the user's list, and a merchant (from the list or a new concise name).

Transaction:
- description: ${txn.description}
- amount: ${amount} ${txn.currency}
- date: ${timestamp}

User's categories (return exactly one of these names, or "Uncategorized"): ${categoryList || "Uncategorized"}

User's merchants (return one of these names, or a new short merchant name): ${merchantList || "None"}

Respond with only a single JSON object, no other text, in this exact shape:
{"description":"...","categoryName":"...","merchantName":"..."}
- description: short, human-readable (e.g. "Coffee at Starbucks", "Salary")
- categoryName: exactly one of the category names above or "Uncategorized"
- merchantName: one of the merchant names above or a new concise name`;

  let result: EnrichmentResult | null = null;
  try {
    result = await callEnrichmentModel(prompt, env);
  } catch (err) {
    console.error("[Transaction enrichment] LLM call failed", { transactionId, err });
    return;
  }

  if (!result) {
    console.warn("[Transaction enrichment] could not parse or validate LLM response", {
      transactionId,
    });
    return;
  }

  const description = result.description.trim().slice(0, 4096) || txn.description;
  const categoryName = result.categoryName.trim();
  const merchantName = result.merchantName.trim();

  let category_id: number | null = null;
  if (categoryName && categoryName.toLowerCase() !== "uncategorized") {
    const cat = categories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase());
    if (cat) category_id = cat.id;
  }

  let merchant_id: number | null = null;
  if (merchantName) {
    try {
      merchant_id = await findOrCreateMerchant(db, userId, merchantName);
    } catch (err) {
      console.error("[Transaction enrichment] findOrCreateMerchant failed", {
        transactionId,
        merchantName,
        err,
      });
    }
  }

  await db
    .update(transaction)
    .set({
      description,
      category_id,
      merchant_id,
      updated_at: new Date(),
    })
    .where(eq(transaction.id, transactionId));

  console.log("[Transaction enrichment] applied", {
    transactionId,
    description: description.slice(0, 50),
    category_id,
    merchant_id,
  });
}
