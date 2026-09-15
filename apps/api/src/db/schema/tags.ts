import {
  index,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";

import { user } from "./auth";
import { transaction } from "./transactions";

export const tag = pgTable(
  "tag",
  {
    id: serial("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    name: varchar("name", { length: 100 }).notNull(),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("tag_user_idx").on(table.user_id),
    uniqueIndex("tag_user_name_unique").on(table.user_id, table.name),
  ],
);

export const transactionTag = pgTable(
  "transaction_tag",
  {
    transaction_id: integer("transaction_id")
      .notNull()
      .references(() => transaction.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    tag_id: integer("tag_id")
      .notNull()
      .references(() => tag.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
  },
  (table) => [
    primaryKey({ columns: [table.transaction_id, table.tag_id] }),
    index("transaction_tag_tag_idx").on(table.tag_id),
  ],
);

export type Tag = typeof tag.$inferSelect;
export type InsertTag = typeof tag.$inferInsert;
export type TransactionTag = typeof transactionTag.$inferSelect;

export const selectTagSchema = createSelectSchema(tag);
export const insertTagSchema = createInsertSchema(tag);
