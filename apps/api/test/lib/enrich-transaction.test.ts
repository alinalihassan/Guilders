import { describe, expect, it } from "vitest";

import { normalizeMerchantName, websiteToLogoUrl } from "../../src/lib/enrich-transaction";
import { fallbackCategoryId } from "../../src/lib/enrich-transaction-ai";
import { filterLockedUpdate, valuesEquivalent } from "../../src/lib/locked-attributes";
import { parseProviderTimestamp } from "../../src/lib/provider-timestamp";

describe("enrich transaction", () => {
  it("strips processor noise without inventing brand names", () => {
    expect(normalizeMerchantName("UBER   * EATS PENDING")).toBe("Uber * Eats");
    expect(normalizeMerchantName("APPLE.COM/BILL")).toBe("Apple");
    expect(normalizeMerchantName("Albert Heijn 1106")).toBe("Albert Heijn");
    expect(normalizeMerchantName("Q-Park Operations Holding BV via Mollie")).toBe(
      "Q-Park Operations Holding Bv",
    );
    expect(normalizeMerchantName("SumUp  *PARK AMSTERDAM")).toBe("Park Amsterdam");
    expect(normalizeMerchantName("transaction")).toBeNull();
    expect(normalizeMerchantName("E.LECLERC")).toBe("E.Leclerc");
  });

  it("builds favicon urls from websites only", () => {
    expect(websiteToLogoUrl("https://apple.com")).toContain("apple.com");
    expect(websiteToLogoUrl("uber.com")).toContain("uber.com");
    expect(websiteToLogoUrl(null)).toBeNull();
  });

  it("falls back to a category the user actually has", () => {
    const categories = [
      { id: 1, name: "Salary", classification: "income" },
      { id: 2, name: "Other Income", classification: "income" },
      { id: 3, name: "Groceries", classification: "expense" },
      { id: 4, name: "Other Expenses", classification: "expense" },
    ];
    expect(fallbackCategoryId(categories, true)).toBe(2);
    expect(fallbackCategoryId(categories, false)).toBe(4);
    expect(fallbackCategoryId([{ id: 9, name: "Coffee", classification: "expense" }], false)).toBe(
      9,
    );
  });
});

describe("provider timestamps", () => {
  it("stores date-only values at UTC noon", () => {
    expect(parseProviderTimestamp("2026-01-15")?.toISOString()).toBe("2026-01-15T12:00:00.000Z");
    expect(parseProviderTimestamp("2026-01-15T00:00:00.000Z")?.toISOString()).toBe(
      "2026-01-15T12:00:00.000Z",
    );
    expect(parseProviderTimestamp("2026-01-15T13:45:00.000Z")?.toISOString()).toBe(
      "2026-01-15T13:45:00.000Z",
    );
  });
});

describe("locked attribute updates", () => {
  it("allows unchanged locked fields and unlocked category edits", () => {
    const existing = {
      amount: "-12.50",
      description: "Cafe",
      category_id: 3,
    };
    const { allowed, blocked } = filterLockedUpdate(
      {
        amount: "-12.50",
        description: "Cafe",
        category_id: 9,
      },
      { amount: true, description: true },
      existing,
    );
    expect(blocked).toEqual([]);
    expect(allowed).toEqual({ category_id: 9 });
    expect(valuesEquivalent("-12.50", -12.5)).toBe(true);
  });
});
