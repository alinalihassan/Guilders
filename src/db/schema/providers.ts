
import { index, pgTable, serial, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-orm/typebox-legacy";

export const provider = pgTable(
  "provider",
  {
    id: serial("id").primaryKey(),
    logo_url: varchar("logo_url", { length: 255 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
  },
  (table) => [index("provider_id_idx").on(table.id)],
);
export type Provider = typeof provider.$inferSelect;
export type InsertProvider = typeof provider.$inferInsert;

export const selectProviderSchema = createSelectSchema(provider);
export const insertProviderSchema = createInsertSchema(provider);
