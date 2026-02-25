import {
  date,
  index,
  integer,
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
    category_id: integer("category_id")
      .notNull()
      .references(() => category.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    created_at: timestamp("created_at").notNull().defaultNow(),
    currency: varchar("currency", { length: 3 })
      .notNull()
      .references(() => currency.code),
    date: date("date").notNull(),
    description: text("description").notNull(),
    documents: varchar("documents", { length: 255 }).array(),
    id: serial("id").primaryKey(),
    provider_transaction_id: varchar("provider_transaction_id", {
      length: 255,
    }),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("transaction_id_idx").on(table.id),
    index("transaction_account_idx").on(table.account_id),
    index("transaction_category_idx").on(table.category_id),
    index("transaction_currency_idx").on(table.currency),
    index("transaction_date_idx").on(table.date),
  ],
);

export type Transaction = typeof transaction.$inferSelect;
export type InsertTransaction = typeof transaction.$inferInsert;

export const selectTransactionSchema = createSelectSchema(transaction);
export const insertTransactionSchema = createInsertSchema(transaction);
