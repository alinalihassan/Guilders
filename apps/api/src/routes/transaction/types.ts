import { t } from "elysia";

import type { InsertTransaction, Transaction as DbTransaction } from "../../db/schema/transactions";

export const transactionQuerySchema = t.Object({
  accountId: t.Optional(t.Number()),
});

export const transactionIdParamSchema = t.Object({
  id: t.Number(),
});

export type Transaction = DbTransaction;

type BaseTransactionInsert = Omit<
  InsertTransaction,
  "id" | "created_at" | "updated_at" | "amount" | "locked_attributes"
>;

export type TransactionInsert = BaseTransactionInsert & {
  amount: number | string;
};
