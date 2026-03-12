import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { account } from "../db/schema/accounts";
import { transaction } from "../db/schema/transactions";
import { createDb } from "./db";
import { findOrCreateMerchant } from "./merchant-from-transaction";

const enrichmentSchema = z.object({
  description: z.string(),
  categoryName: z.string(),
  merchantName: z.string(),
});

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

async function callGateway(prompt: string, env: EnrichmentEnv): Promise<string | unknown> {
  const url = `https://gateway.ai.cloudflare.com/v1/${env.CLOUDFLARE_ACCOUNT_ID}/${env.CLOUDFLARE_AI_GATEWAY}/compat/chat/completions`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "cf-aig-authorization": `Bearer ${env.CLOUDFLARE_AI_GATEWAY_TOKEN}`,
      "cf-aig-zdr": "true",
    },
    body: JSON.stringify({
      model: "workers-ai/@cf/meta/llama-4-scout-17b-16e-instruct",
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
  return typeof content === "string" ? parseJsonFromContent(content) : content;
}

/** One transaction → one API call; returns parsed result or null. */
async function callEnrichmentModelSingle(
  row: { txn: typeof transaction.$inferSelect },
  categoryList: string,
  merchantList: string,
  env: EnrichmentEnv,
): Promise<EnrichmentResult | null> {
  const { txn } = row;
  const date =
    typeof txn.timestamp === "string" ? txn.timestamp : (txn.timestamp?.toISOString?.() ?? "");
  const prompt = `You are a transaction enrichment assistant. Return a short human-readable description, a category from the user's list, and a merchant (from the list or a new concise name).

Transaction: ${txn.description} | ${String(txn.amount)} ${txn.currency} | ${date}

User's categories (use exactly one, or "Uncategorized"): ${categoryList || "Uncategorized"}

User's merchants (use one or a new short name): ${merchantList || "None"}

Respond with only a single JSON object, no other text: {"description":"...","categoryName":"...","merchantName":"..."}`;

  try {
    const raw = await callGateway(prompt, env);
    if (raw == null) return null;
    const parsed = enrichmentSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
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
 * Enriches multiple transactions (same user). One API call per transaction, all in parallel.
 * Updates DB unless dryRun.
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

  const results = await Promise.all(
    ordered.map((row) => callEnrichmentModelSingle(row, categoryList, merchantList, env)),
  );

  const work: Array<{
    row: (typeof ordered)[number];
    description: string;
    categoryName: string;
    merchantName: string;
    category_id: number | null;
  }> = [];
  for (let k = 0; k < ordered.length; k++) {
    const row = ordered[k]!;
    const txn = row.txn;
    const result = results[k];
    if (!result) {
      console.warn("[Transaction enrichment] no result for transaction", { transactionId: txn.id });
      continue;
    }
    const description = result.description.trim().slice(0, 4096) || txn.description;
    const categoryName = result.categoryName.trim();
    const merchantName = result.merchantName.trim();
    let category_id: number | null = null;
    if (categoryName && categoryName.toLowerCase() !== "uncategorized") {
      const cat = categories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase());
      if (cat) category_id = cat.id;
    }
    work.push({ row, description, categoryName, merchantName, category_id });
  }

  const merchantIds = await Promise.all(
    work.map((w) =>
      w.merchantName && !dryRun
        ? findOrCreateMerchant(db, userId, w.merchantName).catch((err) => {
            console.error("[Transaction enrichment] findOrCreateMerchant failed", {
              transactionId: w.row.txn.id,
              merchantName: w.merchantName,
              err,
            });
            return null;
          })
        : Promise.resolve(null as number | null),
    ),
  );

  if (!dryRun) {
    await Promise.all(
      work.map((w, i) =>
        db
          .update(transaction)
          .set({
            description: w.description,
            category_id: w.category_id,
            merchant_id: merchantIds[i] ?? null,
            updated_at: new Date(),
          })
          .where(eq(transaction.id, w.row.txn.id)),
      ),
    );
  }

  const outcomes: EnrichmentOutcome[] = work.map((w, i) => ({
    transactionId: w.row.txn.id,
    description: w.description,
    categoryName: w.categoryName,
    merchantName: w.merchantName,
    category_id: w.category_id,
    merchant_id: merchantIds[i] ?? null,
  }));

  if (!dryRun) {
    for (const o of outcomes) {
      console.log("[Transaction enrichment] applied", {
        transactionId: o.transactionId,
        description: o.description.slice(0, 50),
        category_id: o.category_id,
        merchant_id: o.merchant_id,
      });
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
