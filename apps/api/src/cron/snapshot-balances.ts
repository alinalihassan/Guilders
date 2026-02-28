import { sql } from "drizzle-orm";

import { balanceSnapshot } from "../db/schema/balance-snapshots";
import { createDb } from "../lib/db";

export async function snapshotBalances() {
  const db = createDb();
  const today = new Date().toISOString().split("T")[0]!;
  const allAccounts = await db.query.account.findMany();

  const snapshots = allAccounts.map((a) => ({
    account_id: a.id,
    date: today,
    balance: a.value,
    currency: a.currency,
  }));

  if (snapshots.length === 0) {
    console.log("No accounts to snapshot");
    return;
  }

  await db
    .insert(balanceSnapshot)
    .values(snapshots)
    .onConflictDoUpdate({
      target: [balanceSnapshot.account_id, balanceSnapshot.date],
      set: {
        balance: sql`excluded.balance`,
        currency: sql`excluded.currency`,
      },
    });

  console.log(`Snapshotted ${snapshots.length} account balances for ${today}`);
}
