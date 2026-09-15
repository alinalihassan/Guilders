import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";

import { account } from "./accounts";
import { user } from "./auth";
import { category } from "./categories";
import { tag } from "./tags";

export const rule = pgTable(
  "rule",
  {
    id: serial("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    enabled: boolean("enabled").notNull().default(true),
    position: integer("position").notNull().default(0),
    payee_enabled: boolean("payee_enabled").notNull().default(false),
    payee_match: varchar("payee_match", { length: 20 }).$type<"exact" | "contains">(),
    payee_value: text("payee_value"),
    amount_enabled: boolean("amount_enabled").notNull().default(false),
    amount_kind: varchar("amount_kind", { length: 20 }).$type<"any" | "spending" | "income">(),
    amount_compare: varchar("amount_compare", { length: 20 }).$type<"lt" | "gt" | "between">(),
    amount_value: numeric("amount_value", { precision: 19, scale: 4 }),
    amount_value_max: numeric("amount_value_max", { precision: 19, scale: 4 }),
    set_category_id: integer("set_category_id").references(() => category.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    rename_merchant: text("rename_merchant"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("rule_user_idx").on(table.user_id),
    index("rule_user_position_idx").on(table.user_id, table.position),
  ],
);

export const ruleAccount = pgTable(
  "rule_account",
  {
    rule_id: integer("rule_id")
      .notNull()
      .references(() => rule.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    account_id: integer("account_id")
      .notNull()
      .references(() => account.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
  },
  (table) => [
    primaryKey({ columns: [table.rule_id, table.account_id] }),
    index("rule_account_account_idx").on(table.account_id),
  ],
);

export const ruleTag = pgTable(
  "rule_tag",
  {
    rule_id: integer("rule_id")
      .notNull()
      .references(() => rule.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    tag_id: integer("tag_id")
      .notNull()
      .references(() => tag.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
  },
  (table) => [
    primaryKey({ columns: [table.rule_id, table.tag_id] }),
    index("rule_tag_tag_idx").on(table.tag_id),
  ],
);

export type Rule = typeof rule.$inferSelect;
export type InsertRule = typeof rule.$inferInsert;
export type RuleAccount = typeof ruleAccount.$inferSelect;
export type RuleTag = typeof ruleTag.$inferSelect;

export const selectRuleSchema = createSelectSchema(rule);
export const insertRuleSchema = createInsertSchema(rule);
