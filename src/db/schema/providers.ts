import { relations } from "drizzle-orm";
import { index, pgTable, serial, varchar } from "drizzle-orm/pg-core";
import { institution } from "./institutions";
import { providerConnection } from "./provider-connections";

export const provider = pgTable(
  "provider",
  {
    id: serial("id").primaryKey(),
    logo_url: varchar("logo_url", { length: 255 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
  },
  (table) => [index("provider_id_idx").on(table.id)],
);

export const providerRelations = relations(provider, ({ many }) => ({
  institutions: many(institution),
  connections: many(providerConnection),
}));
