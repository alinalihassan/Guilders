import {
  boolean,
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
import { institution } from "./institutions";
import { providerConnection } from "./provider-connections";

export const institutionConnection = pgTable(
  "institution_connection",
  {
    id: serial("id").primaryKey(),
    broken: boolean("broken").notNull().default(false),
    connection_id: varchar("connection_id", { length: 255 }),
    created_at: timestamp("created_at").notNull().defaultNow(),
    institution_id: integer("institution_id")
      .notNull()
      .references(() => institution.id),
    provider_connection_id: integer("provider_connection_id")
      .notNull()
      .references(() => providerConnection.id),
  },
  (table) => [
    index("institution_connection_id_idx").on(table.id),
    index("institution_connection_institution_idx").on(table.institution_id),
    index("institution_connection_provider_idx").on(
      table.provider_connection_id,
    ),
  ],
);

export type InstitutionConnection = typeof institutionConnection.$inferSelect;
export type InsertInstitutionConnection =
  typeof institutionConnection.$inferInsert;

export const selectInstitutionConnectionSchema = createSelectSchema(
  institutionConnection,
);
export const insertInstitutionConnectionSchema = createInsertSchema(
  institutionConnection,
);
