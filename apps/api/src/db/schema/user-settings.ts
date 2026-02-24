// import { relations } from "drizzle-orm/relations";
import { index, pgTable, varchar } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { currency } from "./currencies";

export const userSetting = pgTable(
  "user_setting",
  {
    currency: varchar("currency", { length: 3 })
      .notNull()
      .references(() => currency.code)
      .default("EUR"),
    user_id: varchar("user_id", { length: 255 })
      .primaryKey()
      .references(() => user.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
  },
  (table) => [
    index("user_setting_user_idx").on(table.user_id),
    index("user_setting_currency_idx").on(table.currency),
  ],
);
