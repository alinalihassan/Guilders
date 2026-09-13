import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  authedFetch,
  createTestUserWithAccount,
  resetTestDb,
  selfFetch,
  uniqueTestEmail,
} from "../helpers";

describe("Balance history routes", () => {
  let token: string;
  let accountId: number;

  beforeAll(async () => {
    const result = await createTestUserWithAccount({
      email: uniqueTestEmail("balance"),
      account: { name: "Balance Test Account", value: "3000" },
    });
    token = result.token;
    accountId = result.accountId;

    const created = await authedFetch("/api/transaction", token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        account_id: accountId,
        amount: "-200.00",
        currency: "EUR",
        timestamp: "2026-03-01T12:00:00.000Z",
        description: "Transfer out",
      }),
    });
    if (!created.ok) {
      throw new Error(
        `Failed to create test transaction: ${created.status} ${await created.text()}`,
      );
    }
  });

  afterAll(async () => {
    await resetTestDb();
  });

  it("GET /api/balance-history without auth returns 401", async () => {
    const res = await selfFetch("/api/balance-history");
    expect(res.status).toBe(401);
  });

  it("GET /api/balance-history reconstructs net worth from transactions", async () => {
    const res = await authedFetch("/api/balance-history?from=2026-02-28&to=2026-03-01", token);
    expect(res.status).toBe(200);

    const body = (await res.json()) as { snapshots: { date: string; balance: string }[] };
    const byDate = Object.fromEntries(
      body.snapshots.map((item) => [item.date, Number(item.balance)]),
    );
    expect(byDate["2026-02-28"]).toBe(3000);
    expect(byDate["2026-03-01"]).toBe(2800);
  });

  it("GET /api/account/:id/balance-history reconstructs the cash series", async () => {
    const res = await authedFetch(
      `/api/account/${accountId}/balance-history?from=2026-02-28&to=2026-03-01`,
      token,
    );
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      snapshots: { date: string; balance: string; currency: string }[];
    };
    expect(body.snapshots[0]!.currency).toBe("EUR");
    const byDate = Object.fromEntries(
      body.snapshots.map((item) => [item.date, Number(item.balance)]),
    );
    expect(byDate["2026-02-28"]).toBe(3000);
    expect(byDate["2026-03-01"]).toBe(2800);
  });

  it("GET /api/account/:id/balance-history for non-existent account returns 404", async () => {
    const res = await authedFetch("/api/account/99999/balance-history", token);
    expect(res.status).toBe(404);
  });
});
