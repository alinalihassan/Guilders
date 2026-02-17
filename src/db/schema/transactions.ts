import { relations } from "drizzle-orm";
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
import { asset } from "./assets";
import { currency } from "./currencies";

export const transaction = pgTable(
  "transaction",
  {
    asset_id: integer("asset_id")
      .notNull()
      .references(() => asset.id),
    amount: numeric("amount", { precision: 19, scale: 4 }).notNull(),
    category: varchar("category", { length: 100 })
      .notNull()
      .default("uncategorized"),
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
    index("transaction_asset_idx").on(table.asset_id),
    index("transaction_currency_idx").on(table.currency),
    index("transaction_date_idx").on(table.date),
  ],
);

export const transactionRelations = relations(transaction, ({ one }) => ({
  asset: one(asset, {
    fields: [transaction.asset_id],
    references: [asset.id],
  }),
  currency: one(currency, {
    fields: [transaction.currency],
    references: [currency.code],
  }),
}));
