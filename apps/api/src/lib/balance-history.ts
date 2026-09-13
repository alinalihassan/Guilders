import { and, eq, gte, inArray, lte, min } from "drizzle-orm";

import { account } from "../db/schema/accounts";
import { AccountSubtypeEnum } from "../db/schema/enums";
import { rate } from "../db/schema/rates";
import { transaction } from "../db/schema/transactions";
import {
  addUtcDays,
  daysBetweenUtc,
  eachUtcDateInclusive,
  parseUtcDate,
  todayUtcDate,
  utcDateKey,
} from "./calendar-dates";
import type { Database } from "./db";
import { createPriceProvider, type DailyAverageSeries } from "./yahoo-finance";

const MAX_HISTORY_DAYS = 730;

export type HistoryPoint = {
  date: string;
  balance: string;
  currency: string;
};

export type NetWorthPoint = {
  date: string;
  balance: string;
};

export type PriceProvider = (
  ticker: string,
  from: string,
  to: string,
) => Promise<DailyAverageSeries | null>;

type HistoryAccount = {
  id: number;
  type: string;
  subtype: string;
  value: string;
  currency: string;
  ticker: string | null;
  units: string | null;
  parent: number | null;
};

type RateRow = { currency_code: string; date: string; rate: number };

const RATE_LOOKBACK_DAYS = 90;
const rateIndexCache = new WeakMap<RateRow[], Map<string, RateRow[]>>();

export function resolveHistoryRange(
  from: string | undefined,
  to: string | undefined,
  earliest?: string,
): { from: string; to: string } {
  const end = to ?? todayUtcDate();
  let start = from ?? earliest ?? addUtcDays(end, -365);
  if (start > end) start = end;
  if (daysBetweenUtc(start, end) > MAX_HISTORY_DAYS) {
    start = addUtcDays(end, -MAX_HISTORY_DAYS);
  }
  return { from: start, to: end };
}

export function cashBalancesOnDays(
  currentValue: number,
  transactions: { amount: number; date: string }[],
  days: string[],
): number[] {
  const byDay = new Map<string, number>();
  for (const item of transactions) {
    byDay.set(item.date, (byDay.get(item.date) ?? 0) + item.amount);
  }

  let after = 0;
  const afterByDay = new Map<string, number>();
  for (let i = days.length - 1; i >= 0; i -= 1) {
    const day = days[i]!;
    afterByDay.set(day, after);
    after += byDay.get(day) ?? 0;
  }

  return days.map((day) => currentValue - (afterByDay.get(day) ?? 0));
}

export function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  date: string,
  rates: RateRow[],
): number {
  if (fromCurrency === toCurrency) return amount;
  const fromRate = rateOnDate(fromCurrency, date, rates);
  const toRate = rateOnDate(toCurrency, date, rates);
  return (amount * toRate) / fromRate;
}

export function signedBalance(type: string, value: number): number {
  return type === "liability" ? -Math.abs(value) : value;
}

export async function computeAccountHistory(
  db: Database,
  userId: string,
  accountId: number,
  from?: string,
  to?: string,
  priceProvider?: PriceProvider,
): Promise<HistoryPoint[] | null> {
  const accounts = await loadUserAccounts(db, userId);
  const target = accounts.find((item) => item.id === accountId);
  if (!target) return null;

  const relevant = accountSubtree(target, accounts);
  const cashIds = cashAccountIds(relevant);
  const earliest = from ? undefined : await loadEarliestTransactionDate(db, cashIds);
  const range = resolveHistoryRange(from, to, earliest ?? utcDateKey(new Date()));
  const [txs, rates, prices] = await Promise.all([
    loadTransactions(db, cashIds, range.from),
    loadRates(db, currenciesForAccounts(relevant), range.from, range.to),
    loadPrices(relevant, range.from, range.to, priceProvider),
  ]);
  const series = seriesForAccount(target, accounts, txs, rates, prices, range.from, range.to);

  return series.map((balance, index) => ({
    date: eachUtcDateInclusive(range.from, range.to)[index]!,
    balance: balance.toFixed(4),
    currency: target.currency,
  }));
}

export async function computeNetWorthHistory(
  db: Database,
  userId: string,
  userCurrency: string,
  from?: string,
  to?: string,
  priceProvider?: PriceProvider,
): Promise<NetWorthPoint[]> {
  const accounts = await loadUserAccounts(db, userId);
  const topLevel = accounts.filter((item) => item.parent == null);
  if (!topLevel.length) return [];

  const cashIds = cashAccountIds(accounts);
  const earliest = from ? undefined : await loadEarliestTransactionDate(db, cashIds);
  const range = resolveHistoryRange(from, to, earliest);
  const days = eachUtcDateInclusive(range.from, range.to);
  const [txs, rates, prices] = await Promise.all([
    loadTransactions(db, cashIds, range.from),
    loadRates(db, currenciesForAccounts(accounts, userCurrency), range.from, range.to),
    loadPrices(accounts, range.from, range.to, priceProvider),
  ]);

  const perAccount = topLevel.map((item) => ({
    account: item,
    values: seriesForAccount(item, accounts, txs, rates, prices, range.from, range.to),
  }));

  return days.map((date, index) => {
    const total = perAccount.reduce((sum, item) => {
      const converted = convertAmount(
        signedBalance(item.account.type, item.values[index] ?? 0),
        item.account.currency,
        userCurrency,
        date,
        rates,
      );
      return sum + converted;
    }, 0);
    return { date, balance: total.toFixed(4) };
  });
}

function seriesForAccount(
  target: HistoryAccount,
  accounts: HistoryAccount[],
  txs: { account_id: number; amount: number; date: string }[],
  rates: RateRow[],
  prices: Map<string, DailyAverageSeries>,
  from: string,
  to: string,
): number[] {
  const days = eachUtcDateInclusive(from, to);
  const children = accounts.filter((item) => item.parent === target.id);
  if (target.subtype === AccountSubtypeEnum.brokerage && children.length) {
    const childSeries = children.map((child) =>
      seriesForAccount(child, accounts, txs, rates, prices, from, to),
    );
    return days.map((date, index) =>
      children.reduce((sum, child, childIndex) => {
        const value = childSeries[childIndex]?.[index] ?? 0;
        return sum + convertAmount(value, child.currency, target.currency, date, rates);
      }, 0),
    );
  }

  if (isPricedHolding(target)) {
    return pricedHoldingSeries(target, prices, rates, days);
  }

  if (isCashLike(target.subtype)) {
    return cashBalancesOnDays(
      Number(target.value),
      txs.filter((item) => item.account_id === target.id),
      days,
    );
  }

  return days.map(() => Number(target.value));
}

function pricedHoldingSeries(
  target: HistoryAccount,
  prices: Map<string, DailyAverageSeries>,
  rates: RateRow[],
  days: string[],
): number[] {
  const units = Number(target.units);
  const ticker = target.ticker?.trim().toUpperCase();
  const series = ticker ? prices.get(ticker) : undefined;
  if (!Number.isFinite(units) || units === 0 || !series) {
    return days.map(() => Number(target.value));
  }

  return days.map((date) => {
    const price = series.prices.get(date);
    if (price == null) return Number(target.value);
    return convertAmount(units * price, series.currency, target.currency, date, rates);
  });
}

function isCashLike(subtype: string): boolean {
  return (
    subtype === AccountSubtypeEnum.depository ||
    subtype === AccountSubtypeEnum.creditcard ||
    subtype === AccountSubtypeEnum.loan
  );
}

function isPricedHolding(account: HistoryAccount): boolean {
  return (
    (account.subtype === AccountSubtypeEnum.stock ||
      account.subtype === AccountSubtypeEnum.crypto) &&
    !!account.ticker?.trim() &&
    Number(account.units) > 0
  );
}

async function loadUserAccounts(db: Database, userId: string): Promise<HistoryAccount[]> {
  return db
    .select({
      id: account.id,
      type: account.type,
      subtype: account.subtype,
      value: account.value,
      currency: account.currency,
      ticker: account.ticker,
      units: account.units,
      parent: account.parent,
    })
    .from(account)
    .where(eq(account.user_id, userId));
}

async function loadEarliestTransactionDate(
  db: Database,
  accountIds: number[],
): Promise<string | undefined> {
  if (!accountIds.length) return undefined;
  const [row] = await db
    .select({ date: min(transaction.timestamp) })
    .from(transaction)
    .where(inArray(transaction.account_id, accountIds));
  return row?.date ? utcDateKey(row.date) : undefined;
}

async function loadTransactions(
  db: Database,
  accountIds: number[],
  from?: string,
): Promise<{ account_id: number; amount: number; date: string }[]> {
  if (!accountIds.length) return [];
  const filters = [inArray(transaction.account_id, accountIds)];
  if (from) filters.push(gte(transaction.timestamp, parseUtcDate(from)));

  const rows = await db
    .select({
      account_id: transaction.account_id,
      amount: transaction.amount,
      timestamp: transaction.timestamp,
    })
    .from(transaction)
    .where(and(...filters));

  return rows.map((row) => ({
    account_id: row.account_id,
    amount: Number(row.amount),
    date: utcDateKey(row.timestamp),
  }));
}

async function loadRates(
  db: Database,
  currencies: string[],
  from: string,
  to: string,
): Promise<RateRow[]> {
  const codes = [...new Set(currencies.filter(Boolean))];
  if (!codes.length) return [];

  const rows = await db
    .select({
      currency_code: rate.currency_code,
      date: rate.date,
      rate: rate.rate,
    })
    .from(rate)
    .where(
      and(
        inArray(rate.currency_code, codes),
        gte(rate.date, addUtcDays(from, -RATE_LOOKBACK_DAYS)),
        lte(rate.date, to),
      ),
    );

  return rows.map((row) => ({
    currency_code: row.currency_code,
    date: row.date,
    rate: Number(row.rate),
  }));
}

function accountSubtree(target: HistoryAccount, accounts: HistoryAccount[]): HistoryAccount[] {
  return [target, ...accounts.filter((item) => item.parent === target.id)];
}

function cashAccountIds(accounts: HistoryAccount[]): number[] {
  return accounts.filter((item) => isCashLike(item.subtype)).map((item) => item.id);
}

function currenciesForAccounts(accounts: HistoryAccount[], extra?: string): string[] {
  return [
    ...new Set(
      [...accounts.map((item) => item.currency), extra, "EUR", "USD", "GBP"].filter(
        (item): item is string => !!item,
      ),
    ),
  ];
}

async function loadPrices(
  accounts: HistoryAccount[],
  from: string,
  to: string,
  priceProvider?: PriceProvider,
): Promise<Map<string, DailyAverageSeries>> {
  const tickers = [
    ...new Set(
      accounts
        .filter(isPricedHolding)
        .map((item) => item.ticker!.trim().toUpperCase())
        .filter(Boolean),
    ),
  ];
  if (!tickers.length) return new Map();

  const provider = priceProvider ?? createPriceProvider();
  const entries = await Promise.all(
    tickers.map(async (ticker) => {
      const series = await provider(ticker, from, to);
      return series ? ([ticker, series] as const) : null;
    }),
  );

  return new Map(
    entries.filter((item): item is readonly [string, DailyAverageSeries] => item != null),
  );
}

function rateOnDate(currency: string, date: string, rates: RateRow[]): number {
  return nearestRate(currency, date, rates) ?? 1;
}

function nearestRate(currency: string, date: string, rates: RateRow[]): number | undefined {
  const series = ratesByCurrency(rates).get(currency);
  if (!series?.length) return undefined;

  let low = 0;
  let high = series.length - 1;
  let found: RateRow | undefined;
  while (low <= high) {
    const mid = (low + high) >> 1;
    const row = series[mid]!;
    if (row.date <= date) {
      found = row;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return found?.rate ?? series[0]?.rate;
}

function ratesByCurrency(rates: RateRow[]): Map<string, RateRow[]> {
  const cached = rateIndexCache.get(rates);
  if (cached) return cached;

  const index = new Map<string, RateRow[]>();
  for (const row of rates) {
    const list = index.get(row.currency_code);
    if (list) list.push(row);
    else index.set(row.currency_code, [row]);
  }
  for (const list of index.values()) {
    list.sort((left, right) => left.date.localeCompare(right.date));
  }
  rateIndexCache.set(rates, index);
  return index;
}
