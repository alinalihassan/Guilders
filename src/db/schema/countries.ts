import { index, pgTable, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-typebox";

export const country = pgTable(
  "country",
  {
    code: varchar("code", { length: 2 }).primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
  },
  (table) => [index("country_code_idx").on(table.code)],
);

export type Country = typeof country.$inferSelect;
export type InsertCountry = typeof country.$inferInsert;

export const selectCountrySchema = createSelectSchema(country);
export const insertCountrySchema = createInsertSchema(country);
