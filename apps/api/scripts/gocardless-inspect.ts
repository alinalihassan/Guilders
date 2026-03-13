/**
 * Uses the GoCardless provider (and client) to fetch and print account + transaction
 * data for a connection. No CURL — same code path as the app.
 *
 * Usage:
 *   bun --env-file=.env scripts/gocardless-inspect.ts <requisition_id> [--raw]
 *   bun --env-file=.env scripts/gocardless-inspect.ts --connection-id=<id> [--raw]
 *
 * Examples:
 *   bun --env-file=.env scripts/gocardless-inspect.ts 902aba9e-6287-4949-9e58-53bdfd2a16c2
 *   bun --env-file=.env scripts/gocardless-inspect.ts 902aba9e-6287-4949-9e58-53bdfd2a16c2 --raw
 *   bun --env-file=.env scripts/gocardless-inspect.ts --connection-id=5
 *
 * Requisition ID = GoCardless requisition UUID (institution_connection.connection_id in DB).
 * --raw = print raw JSON from GoCardless instead of a readable summary.
 */

import { createDb } from "../src/lib/db";
import { GoCardlessClient } from "../src/providers/gocardless/client";
import { GoCardlessProvider } from "../src/providers/gocardless/provider";

async function main() {
  const args = process.argv.slice(2);
  const raw = args.includes("--raw");
  const connectionIdArg = args.find((a) => a.startsWith("--connection-id="));
  const requisitionId = connectionIdArg ? undefined : args.find((a) => !a.startsWith("--"));

  const db = createDb();

  let institutionConnectionId: number;
  let userId: string;

  if (connectionIdArg) {
    const id = connectionIdArg.split("=")[1];
    if (!id) {
      console.error("Usage: --connection-id=<institution_connection.id>");
      process.exit(1);
    }
    institutionConnectionId = parseInt(id, 10);
    if (Number.isNaN(institutionConnectionId)) {
      console.error("connection-id must be a number");
      process.exit(1);
    }
    const row = await db.query.institutionConnection.findFirst({
      where: { id: institutionConnectionId },
      with: { providerConnection: true },
    });
    if (!row?.providerConnection) {
      console.error("Connection not found for id:", institutionConnectionId);
      process.exit(1);
    }
    userId = row.providerConnection.user_id;
  } else if (requisitionId) {
    const row = await db.query.institutionConnection.findFirst({
      where: { connection_id: requisitionId },
      with: { providerConnection: true, institution: true },
    });
    if (!row?.providerConnection) {
      console.error("Connection not found for requisition ID:", requisitionId);
      process.exit(1);
    }
    institutionConnectionId = row.id;
    userId = row.providerConnection.user_id;
  } else {
    console.error(
      "Usage: bun --env-file=.env scripts/gocardless-inspect.ts <requisition_id> [--raw]",
    );
    console.error(
      "   or: bun --env-file=.env scripts/gocardless-inspect.ts --connection-id=<id> [--raw]",
    );
    process.exit(1);
  }

  const provider = new GoCardlessProvider();
  if (!provider.enabled) {
    console.error("GoCardless is not configured (GOCARDLESS_SECRET_ID / GOCARDLESS_SECRET_KEY)");
    process.exit(1);
  }

  const accounts = await provider.getAccounts({
    userId,
    connectionId: institutionConnectionId,
  });

  if (raw) {
    console.log(JSON.stringify({ accounts }, null, 2));
  } else {
    console.log("--- Accounts (from provider.getAccounts) ---");
    for (const a of accounts) {
      console.log(
        `  ${a.name} | ${a.type}/${a.subtype} | ${a.currency} ${a.value} | provider_account_id=${a.provider_account_id}`,
      );
    }
  }

  if (accounts.length === 0) {
    console.log("No accounts.");
    return;
  }

  const secretId = process.env.GOCARDLESS_SECRET_ID!;
  const secretKey = process.env.GOCARDLESS_SECRET_KEY!;
  const client = new GoCardlessClient(secretId, secretKey);

  for (const acc of accounts) {
    const pid = acc.provider_account_id;
    if (!pid) continue;

    const txRes = await client.getAccountTransactions(pid);
    const booked = txRes.transactions?.booked ?? [];
    const pending = txRes.transactions?.pending ?? [];

    if (raw) {
      console.log(
        JSON.stringify({ provider_account_id: pid, transactions: txRes.transactions }, null, 2),
      );
    } else {
      console.log(`\n--- Transactions: ${acc.name} (${pid}) ---`);
      console.log(`  Booked: ${booked.length}, Pending: ${pending.length}`);
      for (const t of booked.slice(0, 10)) {
        const amt = t.transactionAmount;
        const desc =
          t.remittanceInformationUnstructured ??
          t.remittanceInformationUnstructuredArray?.join(", ") ??
          t.creditorName ??
          t.debtorName ??
          "—";
        console.log(`    ${t.bookingDate} | ${amt.currency} ${amt.amount} | ${desc}`);
      }
      if (booked.length > 10) console.log(`    ... and ${booked.length - 10} more`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
