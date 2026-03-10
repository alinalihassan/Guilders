import { index, pgTable, serial, timestamp, uniqueIndex, varchar, text } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-orm/typebox-legacy";

import { user } from "./auth";

export const merchant = pgTable(
  "merchant",
  {
    id: serial("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    name: varchar("name", { length: 255 }).notNull(),
    logo_url: varchar("logo_url", { length: 1024 }),
    website_url: varchar("website_url", { length: 1024 }),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("merchant_user_idx").on(table.user_id),
    uniqueIndex("merchant_user_name_unique").on(table.user_id, table.name),
  ],
);

export type Merchant = typeof merchant.$inferSelect;
export type InsertMerchant = typeof merchant.$inferInsert;

export const selectMerchantSchema = createSelectSchema(merchant);
export const insertMerchantSchema = createInsertSchema(merchant);
