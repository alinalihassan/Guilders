import {
  index,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import {
  createInsertSchema,
  createSelectSchema,
} from "drizzle-orm/typebox-legacy";
import { user } from "./auth";
import { provider } from "./providers";

export const providerConnection = pgTable(
  "provider_connection",
  {
    id: serial("id").primaryKey(),
    created_at: timestamp("created_at").notNull().defaultNow(),
    provider_id: integer("provider_id")
      .notNull()
      .references(() => provider.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    secret: varchar("secret", { length: 255 }),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    user_id: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => user.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
  },
  (table) => [
    index("provider_connection_id_idx").on(table.id),
    index("provider_connection_user_idx").on(table.user_id),
    index("provider_connection_provider_idx").on(table.provider_id),
  ],
);

export type ProviderConnection = typeof providerConnection.$inferSelect;
export type InsertProviderConnection = typeof providerConnection.$inferInsert;

export const selectProviderConnectionSchema =
  createSelectSchema(providerConnection);
export const insertProviderConnectionSchema =
  createInsertSchema(providerConnection);
