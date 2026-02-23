// import { relations } from "drizzle-orm/relations";
import { index, pgTable, varchar } from "drizzle-orm/pg-core";
import { currency } from "./currencies";

export const userSetting = pgTable(
  "user_setting",
  {
    api_key: varchar("api_key", { length: 255 }),
    currency: varchar("currency", { length: 3 })
      .notNull()
      .references(() => currency.code)
      .default("EUR"),
    profile_url: varchar("profile_url", { length: 255 }),
    user_id: varchar("user_id", { length: 255 }).primaryKey(),
  },
  (table) => [
    index("user_setting_user_idx").on(table.user_id),
    index("user_setting_currency_idx").on(table.currency),
  ],
);
