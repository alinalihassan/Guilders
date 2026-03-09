import { Type } from "@sinclair/typebox";
import {
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-orm/typebox-legacy";

import { account } from "./accounts";
import { category } from "./categories";
import { currency } from "./currencies";
import { merchant } from "./merchants";

export const transaction = pgTable(
  "transaction",
  {
    account_id: integer("account_id")
      .notNull()
      .references(() => account.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    amount: numeric("amount", { precision: 19, scale: 4 }).notNull(),
    category_id: integer("category_id").references(() => category.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    merchant_id: integer("merchant_id").references(() => merchant.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    created_at: timestamp("created_at").notNull().defaultNow(),
    currency: varchar("currency", { length: 3 })
      .notNull()
      .references(() => currency.code),
    description: text("description").notNull(),
    documents: varchar("documents", { length: 255 }).array(),
    id: serial("id").primaryKey(),
    locked_attributes: jsonb("locked_attributes")
      .$type<Record<string, boolean>>()
      .notNull()
      .default({}),
    provider_transaction_id: varchar("provider_transaction_id", {
      length: 255,
    }),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("transaction_id_idx").on(table.id),
    index("transaction_account_idx").on(table.account_id),
    index("transaction_category_idx").on(table.category_id),
    index("transaction_merchant_idx").on(table.merchant_id),
    index("transaction_currency_idx").on(table.currency),
    index("transaction_timestamp_idx").on(table.timestamp),
  ],
);

export type Transaction = typeof transaction.$inferSelect;
export type InsertTransaction = typeof transaction.$inferInsert;

export const selectTransactionSchema = createSelectSchema(transaction);
export const insertTransactionSchema = createInsertSchema(transaction, {
  timestamp: Type.String({ format: "date-time" }),
});
