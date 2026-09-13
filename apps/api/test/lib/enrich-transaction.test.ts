import { describe, expect, it } from "vitest";

import { LEGACY_CATEGORY_RENAMES } from "../../src/lib/categories";
import { normalizeMerchantName, websiteToLogoUrl } from "../../src/lib/enrich-transaction";
import {
  coerceCategoryId,
  fallbackCategoryId,
  isOtherCategoryName,
  transactionGroupKey,
  transactionKind,
} from "../../src/lib/enrich-transaction-ai";
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

  it("groups salary, self-transfers, and P2P separately from small incoming", () => {
    expect(transactionKind("Wage/Salary 00216219/202608", 5471)).toBe("salary");
    expect(transactionKind("Sent from Revolut", 13.25)).toBe("xfer");
    expect(transactionKind("Tikkie ID 001287384659, Skate Burgers", 21.27)).toBe("p2p");
    expect(transactionKind("UBER   *ONE MEMBERSHIP Amsterdam, NL", -8.99)).toBe("sub");
    expect(transactionGroupKey({ merchantId: 4, description: "Wage/Salary", amount: 5471 })).toBe(
      "m:4:in:salary",
    );
    expect(transactionGroupKey({ merchantId: 4, description: "A. Hassan", amount: 13.42 })).toBe(
      "m:4:in:std",
    );
    expect(isOtherCategoryName("Other Expenses")).toBe(true);
    expect(isOtherCategoryName("Subscriptions")).toBe(false);
  });

  it("rejects an income category on an outgoing amount", () => {
    const categories = [
      { id: 1, name: "Other Income", classification: "income" },
      { id: 2, name: "Other Expenses", classification: "expense" },
      { id: 3, name: "Rent & Mortgage", classification: "expense" },
      { id: 4, name: "Subscriptions", classification: "expense" },
    ];
    const ids = new Set(categories.map((item) => item.id));
    expect(coerceCategoryId(1, ids, categories, false)).toBe(2);
    expect(coerceCategoryId(3, ids, categories, false)).toBe(3);
    expect(coerceCategoryId(4, ids, categories, true, "cashback")).toBe(4);
    expect(coerceCategoryId(4, ids, categories, true)).toBe(1);
  });

  it("renames legacy defaults onto the Talvo-style set", () => {
    expect(LEGACY_CATEGORY_RENAMES["Car Expenses"]).toBe("Transport");
    expect(LEGACY_CATEGORY_RENAMES.Services).toBe("Subscriptions");
    expect(LEGACY_CATEGORY_RENAMES["Food & Drink"]).toBe("Drinks & Dining");
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
