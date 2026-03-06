import { boolean, index, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-orm/typebox-legacy";

import { user } from "./auth";

export const webhook = pgTable(
  "webhook",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    user_id: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => user.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    url: text("url").notNull(),
    secret: text("secret").notNull(),
    description: text("description"),
    enabled: boolean("enabled").notNull().default(true),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("webhooks_user_id_idx").on(table.user_id)],
);

export type Webhook = typeof webhook.$inferSelect;
export type NewWebhook = typeof webhook.$inferInsert;
export const insertWebhookSchema = createInsertSchema(webhook);
export const selectWebhookSchema = createSelectSchema(webhook);
