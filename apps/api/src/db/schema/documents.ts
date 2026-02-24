// import { relations } from "drizzle-orm/relations";
import { index, integer, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { documentEntityTypeEnum } from "./enums";

export const document = pgTable(
  "document",
  {
    created_at: timestamp("created_at").notNull().defaultNow(),
    entity_id: integer("entity_id").notNull(),
    entity_type: documentEntityTypeEnum("entity_type").notNull(),
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    path: varchar("path", { length: 500 }).notNull(),
    size: integer("size").notNull(),
    type: varchar("type", { length: 100 }).notNull(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    user_id: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => user.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
  },
  (table) => [
    index("document_id_idx").on(table.id),
    index("document_user_idx").on(table.user_id),
    index("document_entity_idx").on(table.entity_id, table.entity_type),
  ],
);

export type Document = typeof document.$inferSelect;
