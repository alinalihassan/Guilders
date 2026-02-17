import { relations } from "drizzle-orm";
import { index, numeric, pgTable, varchar } from "drizzle-orm/pg-core";
import { currency } from "./currencies";

export const rate = pgTable(
  "rate",
  {
    currency_code: varchar("currency_code", { length: 3 })
      .notNull()
      .references(() => currency.code)
      .primaryKey(),
    rate: numeric("rate", { precision: 19, scale: 8 }).notNull(),
  },
  (table) => [index("rate_currency_idx").on(table.currency_code)],
);

export const rateRelations = relations(rate, ({ one }) => ({
  currency: one(currency, {
    fields: [rate.currency_code],
    references: [currency.code],
  }),
}));
