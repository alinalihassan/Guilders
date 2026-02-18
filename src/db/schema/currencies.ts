// import { relations } from "drizzle-orm/relations";
import { index, pgTable, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-orm/typebox-legacy";

export const currency = pgTable(
  "currency",
  {
    code: varchar("code", { length: 3 }).primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
  },
  (table) => [
    index("currency_code_idx").on(table.code),
  ],
);

export type Currency = typeof currency.$inferSelect;
export type InsertCurrency = typeof currency.$inferInsert;

export const selectCurrencySchema = createSelectSchema(currency);
export const insertCurrencySchema = createInsertSchema(currency);
