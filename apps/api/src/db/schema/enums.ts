import { pgEnum } from "drizzle-orm/pg-core";

export function enumToPgEnum<T extends Record<string, string>>(
  myEnum: T,
): [T[keyof T], ...T[keyof T][]] {
  return Object.values(myEnum) as [T[keyof T], ...T[keyof T][]];
}

export enum AccountTypeEnum {
  asset = "asset",
  liability = "liability",
}

export const accountTypeEnum = pgEnum("account_type", enumToPgEnum(AccountTypeEnum));

export enum AccountSubtypeEnum {
  depository = "depository",
  brokerage = "brokerage",
  crypto = "crypto",
  property = "property",
  vehicle = "vehicle",
  creditcard = "creditcard",
  loan = "loan",
  stock = "stock",
}

export const accountSubtypeEnum = pgEnum("account_subtype", enumToPgEnum(AccountSubtypeEnum));

export enum DocumentEntityTypeEnum {
  account = "account",
  transaction = "transaction",
}

export const documentEntityTypeEnum = pgEnum(
  "document_entity_type",
  enumToPgEnum(DocumentEntityTypeEnum),
);

export enum InvestableEnum {
  non_investable = "non_investable",
  investable_easy_convert = "investable_easy_convert",
  investable_cash = "investable_cash",
}

export const investableEnum = pgEnum("investable", enumToPgEnum(InvestableEnum));

export enum SubscriptionStatusEnum {
  unsubscribed = "unsubscribed",
  trialing = "trialing",
  active = "active",
  canceled = "canceled",
  incomplete = "incomplete",
  incomplete_expired = "incomplete_expired",
  past_due = "past_due",
  unpaid = "unpaid",
  paused = "paused",
}

export const subscriptionStatusEnum = pgEnum(
  "subscription_status",
  enumToPgEnum(SubscriptionStatusEnum),
);

export enum TaxabilityEnum {
  taxable = "taxable",
  tax_free = "tax_free",
  tax_deferred = "tax_deferred",
}

export const taxabilityEnum = pgEnum("taxability", enumToPgEnum(TaxabilityEnum));
