import { env } from "cloudflare:workers";
import { and, eq, inArray } from "drizzle-orm";

import { account } from "../db/schema/accounts";
import { document } from "../db/schema/documents";
import type { DocumentEntityTypeEnum } from "../db/schema/enums";
import { transaction } from "../db/schema/transactions";
import type { Database } from "./db";

export async function cleanupEntityDocuments(
  db: Database,
  userId: string,
  entityType: "account" | "transaction",
  entityId: number,
): Promise<void> {
  const docs = await db
    .select({ id: document.id, path: document.path })
    .from(document)
    .where(
      and(
        eq(document.user_id, userId),
        eq(document.entity_type, entityType as DocumentEntityTypeEnum),
        eq(document.entity_id, entityId),
      ),
    );

  if (docs.length === 0) return;

  await Promise.all(docs.map((doc) => env.USER_BUCKET.delete(doc.path)));

  await db.delete(document).where(
    inArray(
      document.id,
      docs.map((d) => d.id),
    ),
  );
}

export async function cleanupAccountDocuments(
  db: Database,
  userId: string,
  accountId: number,
): Promise<void> {
  const accountTransactions = await db
    .select({ id: transaction.id })
    .from(transaction)
    .where(eq(transaction.account_id, accountId));

  await Promise.all(
    accountTransactions.map((t) => cleanupEntityDocuments(db, userId, "transaction", t.id)),
  );

  await cleanupEntityDocuments(db, userId, "account", accountId);
}

/**
 * Clean up all documents (DB rows + R2 files) for every account linked to
 * the given institution connection. Handles each account's child transactions
 * as well. Call this before deleting an institution_connection so that the
 * FK cascade to accounts/transactions doesn't orphan documents.
 */
export async function cleanupInstitutionConnectionDocuments(
  db: Database,
  institutionConnectionId: number,
): Promise<void> {
  const linkedAccounts = await db
    .select({ id: account.id, user_id: account.user_id })
    .from(account)
    .where(eq(account.institution_connection_id, institutionConnectionId));

  await Promise.all(linkedAccounts.map((a) => cleanupAccountDocuments(db, a.user_id, a.id)));
}
