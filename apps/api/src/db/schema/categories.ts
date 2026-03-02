import { index, integer, pgTable, serial, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-orm/typebox-legacy";

import { user } from "./auth";

export const category = pgTable(
  "category",
  {
    id: serial("id").primaryKey(),
    user_id: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => user.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    name: varchar("name", { length: 100 }).notNull(),
    parent_id: integer("parent_id"),
    color: varchar("color", { length: 7 }).default("#64748b"),
    icon: varchar("icon", { length: 100 }),
    classification: varchar("classification", { length: 20 }).notNull().default("expense"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("category_id_idx").on(table.id),
    index("category_user_idx").on(table.user_id),
    index("category_parent_idx").on(table.parent_id),
    uniqueIndex("category_user_name_unique").on(table.user_id, table.name),
  ],
);

export type Category = typeof category.$inferSelect;
export type InsertCategory = typeof category.$inferInsert;

export const selectCategorySchema = createSelectSchema(category);
export const insertCategorySchema = createInsertSchema(category);
