import { index, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

import { user } from "./auth";

export const conversation = pgTable(
  "conversation",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    title: varchar("title", { length: 200 }).notNull().default("New chat"),
    messages: jsonb("messages").$type<unknown[]>().notNull().default([]),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("conversation_user_idx").on(table.user_id),
    index("conversation_updated_idx").on(table.updated_at),
  ],
);

export type Conversation = typeof conversation.$inferSelect;
export type InsertConversation = typeof conversation.$inferInsert;
