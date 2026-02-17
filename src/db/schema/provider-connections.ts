import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { institutionConnection } from "./institution-connections";
import { provider } from "./providers";

export const providerConnection = pgTable(
  "provider_connection",
  {
    id: serial("id").primaryKey(),
    created_at: timestamp("created_at").notNull().defaultNow(),
    provider_id: integer("provider_id")
      .notNull()
      .references(() => provider.id),
    secret: varchar("secret", { length: 255 }),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    user_id: varchar("user_id", { length: 255 }).notNull(),
  },
  (table) => [
    index("provider_connection_id_idx").on(table.id),
    index("provider_connection_user_idx").on(table.user_id),
    index("provider_connection_provider_idx").on(table.provider_id),
  ],
);

export const providerConnectionRelations = relations(
  providerConnection,
  ({ one, many }) => ({
    provider: one(provider, {
      fields: [providerConnection.provider_id],
      references: [provider.id],
    }),
    institutionConnections: many(institutionConnection),
  }),
);
