import { describe, expect, it } from "vitest";

import {
  lunchFlowInstitutionKey,
  mapLunchFlowAccountType,
  mapLunchFlowTransaction,
  normalizeCurrency,
  parseLunchFlowAccounts,
  parseLunchFlowBalance,
  parseLunchFlowTransactions,
  pickLogoUrl,
  slugifyInstitution,
} from "../../src/providers/lunchflow/map";

describe("lunchflow map", () => {
  it("slugs institution names", () => {
    expect(slugifyInstitution("Revolut Business")).toBe("revolut-business");
    expect(slugifyInstitution("  ")).toBe("lunchflow");
  });

  it("prefers a real Lunch Flow connection id", () => {
    expect(lunchFlowInstitutionKey({ connection_id: 12, institution_name: "Revolut" })).toBe(
      "conn:12",
    );
    expect(lunchFlowInstitutionKey({ connection_id: 0, institution_name: "Revolut" })).toBe(
      "revolut",
    );
  });

  it("maps brokerage and credit accounts", () => {
    expect(mapLunchFlowAccountType("snaptrade", "Brokerage")).toEqual({
      type: "asset",
      subtype: "brokerage",
    });
    expect(mapLunchFlowAccountType("gocardless", "Visa Credit")).toEqual({
      type: "liability",
      subtype: "creditcard",
    });
  });

  it("normalizes currencies and logo urls", () => {
    expect(normalizeCurrency("eur")).toBe("EUR");
    expect(normalizeCurrency("RUR")).toBe("RUB");
    expect(normalizeCurrency("")).toBe("USD");
    expect(pickLogoUrl("https://cdn.example/logo.png", "/fallback.svg")).toBe(
      "https://cdn.example/logo.png",
    );
    expect(pickLogoUrl("x".repeat(256), "/fallback.svg")).toBe("/fallback.svg");
  });

  it("parses account, balance, and transaction payloads", () => {
    const accounts = parseLunchFlowAccounts({
      accounts: [
        {
          id: 9,
          name: "Checking",
          institution_name: "Revolut",
          provider: "gocardless",
          currency: "EUR",
          status: "ACTIVE",
        },
      ],
    });
    expect(accounts).toEqual([
      {
        id: 9,
        name: "Checking",
        institution_name: "Revolut",
        institution_logo: null,
        provider: "gocardless",
        currency: "EUR",
        status: "ACTIVE",
        connection_id: null,
      },
    ]);

    expect(parseLunchFlowBalance({ balance: { amount: 12.5, currency: "EUR" } })).toEqual({
      amount: "12.5",
      currency: "EUR",
    });
    expect(parseLunchFlowBalance({ balance: { available: 3, currency: "USD" } })).toEqual({
      amount: "3",
      currency: "USD",
    });

    const transactions = parseLunchFlowTransactions({
      transactions: [
        {
          id: "tx_1",
          accountId: 9,
          amount: -12.3,
          currency: "EUR",
          date: "2026-01-15",
          merchant: "Cafe",
          isPending: false,
        },
        {
          id: "tx_pending",
          amount: -4,
          date: "2026-01-16",
          pending: true,
        },
      ],
    });
    expect(transactions).toHaveLength(2);

    const mapped = mapLunchFlowTransaction(transactions[0]!, 1, "EUR");
    expect(mapped).toMatchObject({
      account_id: 1,
      amount: "-12.3",
      currency: "EUR",
      description: "Cafe",
      provider_transaction_id: "tx_1",
    });
    expect(mapLunchFlowTransaction(transactions[1]!, 1, "EUR")).toBeNull();
  });
});
