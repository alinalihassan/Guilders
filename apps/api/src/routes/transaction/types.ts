import { z } from "zod";

import { selectTagSchema } from "../../db/schema/tags";
import type { Tag } from "../../db/schema/tags";
import { insertTransactionSchema } from "../../db/schema/transactions";
import type { InsertTransaction, Transaction as DbTransaction } from "../../db/schema/transactions";

export const transactionQuerySchema = z.object({
  accountId: z.coerce.number().int().optional(),
});

export const createTransactionSchema = insertTransactionSchema
  .omit({
    id: true,
    created_at: true,
    updated_at: true,
    locked_attributes: true,
  })
  .extend({
    notes: z.string().optional(),
    tag_ids: z.array(z.number().int()).optional(),
  });

export const transactionResponseSchema = insertTransactionSchema.extend({
  id: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  tags: z.array(selectTagSchema).default([]),
});

export type Transaction = DbTransaction & {
  tags: Tag[];
};

export type TransactionInsert = Omit<
  InsertTransaction,
  "id" | "created_at" | "updated_at" | "locked_attributes"
> & {
  tag_ids?: number[];
};
