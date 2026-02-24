import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-orm/typebox-legacy";

import { country } from "./countries";
import { provider } from "./providers";

export const institution = pgTable(
  "institution",
  {
    id: serial("id").primaryKey(),
    country: varchar("country", { length: 2 }).references(() => country.code),
    enabled: boolean("enabled").notNull().default(true),
    logo_url: varchar("logo_url", { length: 255 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    provider_id: integer("provider_id")
      .notNull()
      .references(() => provider.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    provider_institution_id: varchar("provider_institution_id", {
      length: 255,
    }).notNull(),
  },
  (table) => [
    index("institution_id_idx").on(table.id),
    index("institution_provider_idx").on(table.provider_id),
    index("institution_country_idx").on(table.country),
    uniqueIndex("institution_provider_provider_institution_unique").on(
      table.provider_id,
      table.provider_institution_id,
    ),
  ],
);

export type Institution = typeof institution.$inferSelect;
export type InsertInstitution = typeof institution.$inferInsert;

export const selectInstitutionSchema = createSelectSchema(institution);
export const insertInstitutionSchema = createInsertSchema(institution);
