import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { subscriptionStatusEnum } from "./enums";

export const subscription = pgTable(
  "subscription",
  {
    cancel_at: timestamp("cancel_at"),
    cancel_at_period_end: boolean("cancel_at_period_end"),
    canceled_at: timestamp("canceled_at"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    current_period_end: timestamp("current_period_end").notNull(),
    current_period_start: timestamp("current_period_start").notNull(),
    ended_at: timestamp("ended_at"),
    id: serial("id").primaryKey(),
    status: subscriptionStatusEnum("status"),
    stripe_customer_id: varchar("stripe_customer_id", {
      length: 255,
    }).notNull(),
    trial_end: timestamp("trial_end"),
    trial_start: timestamp("trial_start"),
    user_id: varchar("user_id", { length: 255 }).notNull(),
  },
  (table) => [
    index("subscription_id_idx").on(table.id),
    index("subscription_user_idx").on(table.user_id),
    index("subscription_stripe_customer_idx").on(table.stripe_customer_id),
  ],
);

export const subscriptionRelations = relations(subscription, () => ({}));
