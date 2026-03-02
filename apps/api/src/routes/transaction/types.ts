import { t } from "elysia";

import type { InsertTransaction, Transaction as DbTransaction } from "../../db/schema/transactions";

export const transactionQuerySchema = t.Object({
  accountId: t.Optional(t.Number()),
});

export const transactionIdParamSchema = t.Object({
  id: t.Number(),
});

export type Transaction = DbTransaction;

export type TransactionInsert = Omit<
  InsertTransaction,
  "id" | "created_at" | "updated_at" | "locked_attributes"
>;
