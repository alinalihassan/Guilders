import { index, pgTable, varchar } from "drizzle-orm/pg-core";

export const country = pgTable(
  "country",
  {
    code: varchar("code", { length: 2 }).primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
  },
  (table) => [index("country_code_idx").on(table.code)],
);
