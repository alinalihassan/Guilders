import { AccountSubtypeEnum, AccountTypeEnum } from "../../db/schema/enums";
import { parseProviderTimestamp } from "../../lib/provider-timestamp";
import type { ProviderTransaction } from "../types";
import type { LunchFlowAccount, LunchFlowBalance, LunchFlowTransaction } from "./types";

export function slugifyInstitution(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "lunchflow";
}

export function lunchFlowInstitutionKey(account: {
  connection_id?: number | null;
  institution_name?: string | null;
}): string {
  if (typeof account.connection_id === "number" && account.connection_id > 0) {
    return `conn:${account.connection_id}`;
  }
  return slugifyInstitution(account.institution_name ?? "");
}

export function isActiveLunchFlowAccount(status?: string | null): boolean {
  return !status || status.toUpperCase() === "ACTIVE";
}

export function mapLunchFlowAccountType(
  provider: string,
  name: string,
): {
  type: (typeof AccountTypeEnum)[keyof typeof AccountTypeEnum];
  subtype: (typeof AccountSubtypeEnum)[keyof typeof AccountSubtypeEnum];
} {
  const providerName = provider.toLowerCase();
  const accountName = name.toLowerCase();

  if (providerName === "snaptrade") {
    return { type: AccountTypeEnum.asset, subtype: AccountSubtypeEnum.brokerage };
  }
  if (
    accountName.includes("credit") ||
    accountName.includes("visa") ||
    accountName.includes("mastercard")
  ) {
    return { type: AccountTypeEnum.liability, subtype: AccountSubtypeEnum.creditcard };
  }
  if (accountName.includes("loan") || accountName.includes("mortgage")) {
    return { type: AccountTypeEnum.liability, subtype: AccountSubtypeEnum.loan };
  }
  return { type: AccountTypeEnum.asset, subtype: AccountSubtypeEnum.depository };
}

export function truncateName(value: string, max: number): string {
  const trimmed = value.trim();
  if (!trimmed) return "Account";
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max);
}

export function normalizeCurrency(code?: string | null): string {
  const currency = (code ?? "").trim().toUpperCase();
  if (currency === "RUR") return "RUB";
  if (/^[A-Z]{3}$/.test(currency)) return currency;
  return "USD";
}

export function pickLogoUrl(url: string | undefined | null, fallback: string): string {
  if (!url || url.length > 255) return fallback;
  return url;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  return undefined;
}

export function parseLunchFlowAccounts(body: unknown): LunchFlowAccount[] {
  const record = asRecord(body);
  const rawAccounts = record?.accounts;
  if (!Array.isArray(rawAccounts)) return [];

  const accounts: LunchFlowAccount[] = [];
  for (const item of rawAccounts) {
    const account = asRecord(item);
    if (!account) continue;
    const id = asNumber(account.id);
    const name = asString(account.name);
    if (id === undefined || !name) continue;
    accounts.push({
      id,
      name,
      institution_name: asString(account.institution_name) ?? "Lunch Flow",
      institution_logo: asString(account.institution_logo) ?? null,
      provider: asString(account.provider) ?? "lunchflow",
      currency: asString(account.currency) ?? null,
      status: asString(account.status) ?? null,
      connection_id: asNumber(account.connection_id) ?? null,
    });
  }
  return accounts;
}

export function parseLunchFlowBalance(body: unknown): LunchFlowBalance | null {
  const record = asRecord(body);
  const balance = asRecord(record?.balance) ?? record;
  if (!balance) return null;

  const amount = asNumber(balance.amount ?? balance.available ?? balance.current ?? balance.ledger);
  if (amount === undefined) return null;

  return {
    amount: String(amount),
    currency: asString(balance.currency),
  };
}

export function parseLunchFlowTransactions(body: unknown): LunchFlowTransaction[] {
  const record = asRecord(body);
  const rawTransactions = record?.transactions;
  if (!Array.isArray(rawTransactions)) return [];

  const transactions: LunchFlowTransaction[] = [];
  for (const item of rawTransactions) {
    const transaction = asRecord(item);
    if (!transaction) continue;
    const id = asString(transaction.id);
    const amount = asNumber(transaction.amount);
    const date = asString(transaction.date);
    if (!id || amount === undefined || !date) continue;
    transactions.push({
      id,
      account_id: asNumber(transaction.account_id ?? transaction.accountId),
      amount,
      currency: asString(transaction.currency),
      date,
      merchant: asString(transaction.merchant ?? transaction.merchant_name),
      description: asString(transaction.description),
      category: asString(transaction.category ?? transaction.merchant_category),
      pending: asBoolean(transaction.pending ?? transaction.isPending ?? transaction.is_pending),
    });
  }
  return transactions;
}

export function mapLunchFlowTransaction(
  transaction: LunchFlowTransaction,
  accountId: number,
  fallbackCurrency: string,
): ProviderTransaction | null {
  if (transaction.pending) return null;
  const timestamp = parseProviderTimestamp(transaction.date);
  if (!timestamp) return null;

  const merchantName = transaction.merchant || transaction.description || null;
  const description = transaction.description || transaction.merchant || "Transaction";

  return {
    account_id: accountId,
    amount: String(transaction.amount),
    currency: normalizeCurrency(transaction.currency ?? fallbackCurrency),
    timestamp,
    description,
    provider_transaction_id: transaction.id,
    merchant_name: merchantName,
    provider_category: transaction.category ?? null,
  };
}
