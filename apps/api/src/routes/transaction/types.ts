import { z } from "zod";

import { insertTransactionSchema } from "../../db/schema/transactions";
import type { InsertTransaction, Transaction as DbTransaction } from "../../db/schema/transactions";

export const transactionQuerySchema = z.object({
  accountId: z.coerce.number().int().optional(),
});

export const createTransactionSchema = insertTransactionSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  locked_attributes: true,
});

export type Transaction = DbTransaction;

export type TransactionInsert = Omit<
  InsertTransaction,
  "id" | "created_at" | "updated_at" | "locked_attributes"
>;
