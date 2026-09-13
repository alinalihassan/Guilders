import YahooFinance from "yahoo-finance2";

import { addUtcDays, eachUtcDateInclusive, utcDateKey } from "./calendar-dates";

export type DailyAverageSeries = {
  currency: string;
  prices: Map<string, number>;
};

type SerializedSeries = {
  currency: string;
  from: string;
  to: string;
  prices: Record<string, number>;
};

const PRICE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CHART_TIMEOUT_MS = 8_000;
const priceMemory = new Map<string, { expiresAt: number; series: SerializedSeries }>();

export function dailyAveragePrice(
  high?: number | null,
  low?: number | null,
  close?: number | null,
  open?: number | null,
): number | null {
  if (isFiniteNumber(high) && isFiniteNumber(low)) return (high + low) / 2;
  if (isFiniteNumber(close)) return close;
  if (isFiniteNumber(open)) return open;
  return null;
}

export function normalizeYahooCurrency(currency: string): { currency: string; scale: number } {
  if (currency === "GBp" || currency === "GBX") return { currency: "GBP", scale: 0.01 };
  return { currency: currency.toUpperCase(), scale: 1 };
}

export function forwardFillPrices(
  from: string,
  to: string,
  observed: Map<string, number>,
): Map<string, number> {
  const filled = new Map<string, number>();
  const prior = [...observed.entries()]
    .filter(([date]) => date < from)
    .toSorted(([left], [right]) => left.localeCompare(right))
    .at(-1)?.[1];
  let last = prior;

  for (const date of eachUtcDateInclusive(from, to)) {
    const price = observed.get(date);
    if (price != null) last = price;
    if (last != null) filled.set(date, last);
  }
  return filled;
}

export function slicePriceSeries(
  series: DailyAverageSeries,
  from: string,
  to: string,
): DailyAverageSeries {
  const prices = new Map<string, number>();
  for (const date of eachUtcDateInclusive(from, to)) {
    const price = series.prices.get(date);
    if (price != null) prices.set(date, price);
  }
  return { currency: series.currency, prices };
}

function createYahooFinance(concurrency: number) {
  return new YahooFinance({
    suppressNotices: ["yahooSurvey"],
    versionCheck: false,
    queue: { concurrency },
  });
}

export function createPriceProvider(): (
  ticker: string,
  from: string,
  to: string,
) => Promise<DailyAverageSeries | null> {
  const yahooFinance = createYahooFinance(4);
  return (ticker, from, to) => getDailyAveragePrices(ticker, from, to, yahooFinance);
}

export async function getDailyAveragePrices(
  ticker: string,
  from: string,
  to: string,
  yahooFinance = createYahooFinance(1),
): Promise<DailyAverageSeries | null> {
  const symbol = ticker.trim().toUpperCase();
  if (!symbol) return null;

  const cached = readPriceCache(symbol, from, to);
  if (cached) return cached;

  try {
    const result = await yahooFinance.chart(
      symbol,
      {
        period1: addUtcDays(from, -7),
        period2: addUtcDays(to, 1),
        interval: "1d",
      },
      { fetchOptions: { signal: AbortSignal.timeout(CHART_TIMEOUT_MS) } },
    );

    const { currency, scale } = normalizeYahooCurrency(result.meta.currency || "USD");
    const observed = new Map<string, number>();
    for (const quote of result.quotes) {
      const average = dailyAveragePrice(quote.high, quote.low, quote.close, quote.open);
      if (average == null) continue;
      observed.set(utcDateKey(quote.date), average * scale);
    }
    if (!observed.size) return null;

    const series = {
      currency,
      prices: forwardFillPrices(from, to, observed),
    };
    writePriceCache(symbol, {
      currency,
      from,
      to,
      prices: Object.fromEntries(series.prices),
    });
    return series;
  } catch (error) {
    console.error("[yahoo] chart failed", { ticker: symbol, error });
    return null;
  }
}

function readPriceCache(symbol: string, from: string, to: string): DailyAverageSeries | null {
  const memory = priceMemory.get(symbol);
  if (!memory || memory.expiresAt <= Date.now()) return null;
  if (memory.series.from > from || memory.series.to < to) return null;
  return slicePriceSeries(deserializeSeries(memory.series), from, to);
}

function writePriceCache(symbol: string, series: SerializedSeries): void {
  const existing = priceMemory.get(symbol);
  if (existing && existing.expiresAt > Date.now()) {
    if (existing.series.from <= series.from && existing.series.to >= series.to) return;
    series = {
      currency: series.currency,
      from: existing.series.from < series.from ? existing.series.from : series.from,
      to: existing.series.to > series.to ? existing.series.to : series.to,
      prices: { ...existing.series.prices, ...series.prices },
    };
  }

  priceMemory.set(symbol, {
    expiresAt: Date.now() + PRICE_CACHE_TTL_MS,
    series,
  });
}

function deserializeSeries(cached: SerializedSeries): DailyAverageSeries {
  return {
    currency: cached.currency,
    prices: new Map(Object.entries(cached.prices)),
  };
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
