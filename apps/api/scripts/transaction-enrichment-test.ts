/**
 * Test script for transaction enrichment. Runs the enrichment model on a set of
 * transactions and prints results. Use --dry-run to see suggested enrichments
 * without writing to the database.
 *
 * Usage:
 *   bun --env-file=.env scripts/transaction-enrichment-test.ts --user-id=<userId> [--limit=20] [--dry-run]
 *
 * Env: DATABASE_URL, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_AI_GATEWAY, CLOUDFLARE_AI_GATEWAY_TOKEN
 *
 * Examples:
 *   bun --env-file=.env scripts/transaction-enrichment-test.ts --user-id=abc123 --limit=5 --dry-run
 *   bun --env-file=.env scripts/transaction-enrichment-test.ts --user-id=abc123 --limit=10
 */

import { desc, eq, inArray } from "drizzle-orm";

import { account } from "../src/db/schema/accounts";
import { transaction } from "../src/db/schema/transactions";
import { createDb } from "../src/lib/db";
import { type EnrichmentEnv, enrichTransactions } from "../src/lib/transaction-enrichment";

function parseArgs(): { userId: string; limit: number; dryRun: boolean } {
  const args = process.argv.slice(2);
  const userArg = args.find((a) => a.startsWith("--user-id="));
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const dryRun = args.includes("--dry-run");

  if (!userArg) {
    console.error(
      "Usage: bun --env-file=.env scripts/transaction-enrichment-test.ts --user-id=<userId> [--limit=20] [--dry-run]",
    );
    process.exit(1);
  }

  const userId = userArg.split("=")[1]?.trim();
  if (!userId) {
    console.error("--user-id= must not be empty");
    process.exit(1);
  }

  let limit = 20;
  if (limitArg) {
    const n = parseInt(limitArg.split("=")[1] ?? "", 10);
    if (!Number.isNaN(n) && n >= 1 && n <= 100) limit = n;
  }

  return { userId, limit, dryRun };
}

async function main() {
  const { userId, limit, dryRun } = parseArgs();

  const env: EnrichmentEnv = {
    CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID!,
    CLOUDFLARE_AI_GATEWAY: process.env.CLOUDFLARE_AI_GATEWAY!,
    CLOUDFLARE_AI_GATEWAY_TOKEN: process.env.CLOUDFLARE_AI_GATEWAY_TOKEN!,
  };

  if (
    !env.CLOUDFLARE_ACCOUNT_ID ||
    !env.CLOUDFLARE_AI_GATEWAY ||
    !env.CLOUDFLARE_AI_GATEWAY_TOKEN
  ) {
    console.error(
      "Missing env: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_AI_GATEWAY, CLOUDFLARE_AI_GATEWAY_TOKEN",
    );
    process.exit(1);
  }

  const db = createDb();

  const userAccounts = await db
    .select({ id: account.id })
    .from(account)
    .where(eq(account.user_id, userId));

  if (userAccounts.length === 0) {
    console.error("No accounts found for user:", userId);
    process.exit(1);
  }

  const accountIds = userAccounts.map((a) => a.id);
  const txns = await db
    .select({ id: transaction.id, description: transaction.description })
    .from(transaction)
    .where(inArray(transaction.account_id, accountIds))
    .orderBy(desc(transaction.timestamp))
    .limit(limit);

  if (txns.length === 0) {
    console.error("No transactions found for user:", userId);
    process.exit(1);
  }

  const transactionIds = txns.map((t) => t.id);
  console.log(
    `Running enrichment on ${transactionIds.length} transaction(s) for user ${userId}${dryRun ? " (dry-run, no DB writes)" : ""}...\n`,
  );

  const start = Date.now();
  const outcomes = await enrichTransactions(transactionIds, env, { dryRun });
  const elapsed = Date.now() - start;

  console.log(`\nCompleted in ${elapsed}ms. Results:\n`);
  const idToOriginal = new Map(txns.map((t) => [t.id, t.description]));
  for (const o of outcomes) {
    const original = idToOriginal.get(o.transactionId) ?? "";
    console.log(`  id=${o.transactionId}`);
    console.log(`    original: ${original.slice(0, 60)}${original.length > 60 ? "..." : ""}`);
    console.log(
      `    description: ${o.description.slice(0, 60)}${o.description.length > 60 ? "..." : ""}`,
    );
    console.log(`    category: ${o.categoryName} (id: ${o.category_id ?? "—"})`);
    console.log(`    merchant: ${o.merchantName} (id: ${o.merchant_id ?? "—"})`);
    console.log("");
  }

  if (!dryRun && outcomes.length > 0) {
    console.log(`${outcomes.length} transaction(s) updated in the database.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
