import { describe, expect, it } from "vitest";

import {
  cashBalancesOnDays,
  convertAmount,
  resolveHistoryRange,
  signedBalance,
} from "../../src/lib/balance-history";
import { addUtcDays, eachUtcDateInclusive } from "../../src/lib/calendar-dates";
import {
  dailyAveragePrice,
  forwardFillPrices,
  normalizeYahooCurrency,
  slicePriceSeries,
} from "../../src/lib/yahoo-finance";

describe("balance history", () => {
  it("walks cash balances back from the current value", () => {
    const days = eachUtcDateInclusive("2026-03-01", "2026-03-03");
    const balances = cashBalancesOnDays(
      2800,
      [
        { amount: -200, date: "2026-03-01" },
        { amount: 50, date: "2026-03-03" },
      ],
      days,
    );
    expect(balances).toEqual([2750, 2750, 2800]);
  });

  it("converts through EUR-based rates and signs liabilities", () => {
    const rates = [
      { currency_code: "USD", date: "2026-03-01", rate: 1.1 },
      { currency_code: "GBP", date: "2026-03-01", rate: 0.85 },
    ];
    expect(convertAmount(110, "USD", "GBP", "2026-03-01", rates)).toBeCloseTo(85);
    expect(signedBalance("liability", 400)).toBe(-400);
    expect(signedBalance("asset", 400)).toBe(400);
  });

  it("caps an unbounded range at two years", () => {
    const range = resolveHistoryRange(undefined, "2026-03-01", "2010-01-01");
    expect(range.to).toBe("2026-03-01");
    expect(range.from).toBe(addUtcDays("2026-03-01", -730));
  });

  it("uses the daily high/low average and forward-fills weekends", () => {
    expect(dailyAveragePrice(12, 8, 11, 10)).toBe(10);
    expect(dailyAveragePrice(null, null, 11, 10)).toBe(11);

    const filled = forwardFillPrices(
      "2026-03-06",
      "2026-03-08",
      new Map([
        ["2026-03-05", 9],
        ["2026-03-06", 10],
      ]),
    );
    expect(filled.get("2026-03-06")).toBe(10);
    expect(filled.get("2026-03-07")).toBe(10);
    expect(filled.get("2026-03-08")).toBe(10);
  });

  it("normalizes pence quotes and slices a cached series", () => {
    expect(normalizeYahooCurrency("GBp")).toEqual({ currency: "GBP", scale: 0.01 });
    expect(normalizeYahooCurrency("EUR")).toEqual({ currency: "EUR", scale: 1 });

    const sliced = slicePriceSeries(
      {
        currency: "EUR",
        prices: new Map([
          ["2026-03-01", 10],
          ["2026-03-02", 11],
          ["2026-03-03", 12],
        ]),
      },
      "2026-03-02",
      "2026-03-03",
    );
    expect([...sliced.prices.keys()]).toEqual(["2026-03-02", "2026-03-03"]);
  });
});
