import { relations } from "drizzle-orm";
import { index, pgTable, varchar } from "drizzle-orm/pg-core";
import { country } from "./countries";
import { rate } from "./rates";

export const currency = pgTable(
  "currency",
  {
    code: varchar("code", { length: 3 }).primaryKey(),
    country: varchar("country", { length: 2 })
      .notNull()
      .references(() => country.code),
    name: varchar("name", { length: 100 }).notNull(),
  },
  (table) => [
    index("currency_code_idx").on(table.code),
    index("currency_country_idx").on(table.country),
  ],
);

export const currencyRelations = relations(currency, ({ one, many }) => ({
  country: one(country, {
    fields: [currency.country],
    references: [country.code],
  }),
  rates: many(rate),
}));
