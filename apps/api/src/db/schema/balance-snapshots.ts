import {
  date,
  index,
  integer,
  numeric,
  pgTable,
  serial,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-orm/typebox-legacy";

import { account } from "./accounts";
import { currency } from "./currencies";

export const balanceSnapshot = pgTable(
  "balance_snapshot",
  {
    id: serial("id").primaryKey(),
    account_id: integer("account_id")
      .notNull()
      .references(() => account.id, { onDelete: "cascade", onUpdate: "cascade" }),
    date: date("date").notNull(),
    balance: numeric("balance", { precision: 19, scale: 4 }).notNull(),
    currency: varchar("currency", { length: 3 })
      .notNull()
      .references(() => currency.code),
    created_at: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("balance_snapshot_account_idx").on(table.account_id),
    index("balance_snapshot_date_idx").on(table.date),
    uniqueIndex("balance_snapshot_account_date_idx").on(table.account_id, table.date),
  ],
);

export type BalanceSnapshot = typeof balanceSnapshot.$inferSelect;
export type InsertBalanceSnapshot = typeof balanceSnapshot.$inferInsert;

export const selectBalanceSnapshotSchema = createSelectSchema(balanceSnapshot);
export const insertBalanceSnapshotSchema = createInsertSchema(balanceSnapshot);
