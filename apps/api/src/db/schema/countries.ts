import { index, pgTable, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-orm/typebox-legacy";

import { currency } from "./currencies";

export const country = pgTable(
  "country",
  {
    code: varchar("code", { length: 2 }).primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    currency_code: varchar("currency_code", { length: 3 })
      .notNull()
      .references(() => currency.code),
  },
  (table) => [
    index("country_code_idx").on(table.code),
    index("country_currency_idx").on(table.currency_code),
  ],
);

export type Country = typeof country.$inferSelect;
export type InsertCountry = typeof country.$inferInsert;

export const selectCountrySchema = createSelectSchema(country);
export const insertCountrySchema = createInsertSchema(country);
