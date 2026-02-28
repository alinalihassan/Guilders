import { date, index, numeric, pgTable, primaryKey, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-orm/typebox-legacy";

import { currency } from "./currencies";

export const rate = pgTable(
  "rate",
  {
    currency_code: varchar("currency_code", { length: 3 })
      .notNull()
      .references(() => currency.code),
    date: date("date").notNull(),
    rate: numeric("rate", { precision: 19, scale: 8 }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.currency_code, table.date] }),
    index("rate_currency_idx").on(table.currency_code),
    index("rate_date_idx").on(table.date),
  ],
);

export type Rate = typeof rate.$inferSelect;
export type InsertRate = typeof rate.$inferInsert;

export const selectRateSchema = createSelectSchema(rate);
export const insertRateSchema = createInsertSchema(rate);
