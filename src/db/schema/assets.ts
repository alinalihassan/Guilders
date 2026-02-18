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
import {
  createInsertSchema,
  createSelectSchema,
} from "drizzle-orm/typebox-legacy";
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

export type Asset = typeof asset.$inferSelect;
export type InsertAsset = typeof asset.$inferInsert;

export const selectAssetSchema = createSelectSchema(asset);
export const insertAssetSchema = createInsertSchema(asset);
