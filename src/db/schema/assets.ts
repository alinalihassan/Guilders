import { relations } from "drizzle-orm";
import {
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
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
import { transaction } from "./transactions";

export const asset = pgTable(
  "asset",
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
    ),
    investable: investableEnum("investable")
      .notNull()
      .default(InvestableEnum.investable_cash),
    name: varchar("name", { length: 100 }).notNull(),
    notes: text("notes").notNull().default(""),
    parent: integer("parent"),
    provider_account_id: varchar("provider_account_id", { length: 255 }),
    subtype: accountSubtypeEnum("subtype").notNull(),
    tax_rate: numeric("tax_rate", { precision: 5, scale: 4 }),
    taxability: taxabilityEnum("taxability")
      .notNull()
      .default(TaxabilityEnum.tax_free),
    ticker: varchar("ticker", { length: 20 }),
    type: accountTypeEnum("type").notNull(),
    units: numeric("units", { precision: 19, scale: 8 }),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    user_id: varchar("user_id", { length: 255 }).notNull(),
    value: numeric("value", { precision: 19, scale: 4 }).notNull(),
  },
  (table) => [
    index("asset_id_idx").on(table.id),
    index("asset_user_idx").on(table.user_id),
    index("asset_currency_idx").on(table.currency),
    index("asset_parent_idx").on(table.parent),
    index("asset_institution_connection_idx").on(
      table.institution_connection_id,
    ),
  ],
);

export const assetRelations = relations(asset, ({ one, many }) => ({
  currency: one(currency, {
    fields: [asset.currency],
    references: [currency.code],
  }),
  institutionConnection: one(institutionConnection, {
    fields: [asset.institution_connection_id],
    references: [institutionConnection.id],
  }),
  transactions: many(transaction),
}));
