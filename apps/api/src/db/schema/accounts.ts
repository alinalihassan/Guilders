import {
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-orm/typebox-legacy";

import { user } from "./auth";
import { currency } from "./currencies";
import {
  accountSubtypeEnum,
  accountTypeEnum,
  InvestableEnum,
  investableEnum,
  TaxabilityEnum,
  taxabilityEnum,
} from "./enums";
import { institutionConnection } from "./institution-connections";

export const account = pgTable(
  "account",
  {
    cost: numeric("cost", { precision: 19, scale: 4 }),
    created_at: timestamp("created_at").notNull().defaultNow(),
    currency: varchar("currency", { length: 3 })
      .notNull()
      .references(() => currency.code),
    documents: varchar("documents", { length: 255 }).array(),
    id: serial("id").primaryKey(),
    image: varchar("image", { length: 255 }),
    institution_connection_id: integer("institution_connection_id").references(
      () => institutionConnection.id,
      {
        onDelete: "cascade",
        onUpdate: "cascade",
      },
    ),
    investable: investableEnum("investable").notNull().default(InvestableEnum.investable_cash),
    locked_attributes: jsonb("locked_attributes")
      .$type<Record<string, boolean>>()
      .notNull()
      .default({}),
    name: varchar("name", { length: 100 }).notNull(),
    notes: text("notes").notNull().default(""),
    parent: integer("parent"),
    provider_account_id: varchar("provider_account_id", { length: 255 }),
    subtype: accountSubtypeEnum("subtype").notNull(),
    tax_rate: numeric("tax_rate", { precision: 5, scale: 4 }),
    taxability: taxabilityEnum("taxability").notNull().default(TaxabilityEnum.tax_free),
    ticker: varchar("ticker", { length: 20 }),
    type: accountTypeEnum("type").notNull(),
    units: numeric("units", { precision: 19, scale: 8 }),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    user_id: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => user.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    value: numeric("value", { precision: 19, scale: 4 }).notNull(),
  },
  (table) => [
    index("account_id_idx").on(table.id),
    index("account_user_idx").on(table.user_id),
    index("account_currency_idx").on(table.currency),
    index("account_parent_idx").on(table.parent),
    index("account_institution_connection_idx").on(table.institution_connection_id),
    uniqueIndex("account_provider_account_connection_idx").on(
      table.provider_account_id,
      table.institution_connection_id,
    ),
  ],
);

export type Account = typeof account.$inferSelect;
export type InsertAccount = typeof account.$inferInsert;

export const selectAccountSchema = createSelectSchema(account);
export const insertAccountSchema = createInsertSchema(account);
