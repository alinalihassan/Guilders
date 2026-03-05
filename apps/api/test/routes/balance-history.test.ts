import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { balanceSnapshot } from "../../src/db/schema/balance-snapshots";
import { rate } from "../../src/db/schema/rates";
import { createDb } from "../../src/lib/db";
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

    const db = createDb();
    await db
      .insert(rate)
      .values([{ currency_code: "USD", date: "2026-03-01", rate: "1.08500000" }])
      .onConflictDoNothing();

    await db
      .insert(balanceSnapshot)
      .values([
        { account_id: accountId, date: "2026-02-28", balance: "2800.0000", currency: "EUR" },
        { account_id: accountId, date: "2026-03-01", balance: "3000.0000", currency: "EUR" },
      ])
      .onConflictDoNothing();
  });

  afterAll(async () => {
    await resetTestDb();
  });

  it("GET /api/balance-history without auth returns 401", async () => {
    const res = await selfFetch("/api/balance-history");
    expect(res.status).toBe(401);
  });

  it("GET /api/balance-history returns net worth snapshots", async () => {
    const res = await authedFetch("/api/balance-history", token);
    expect(res.status).toBe(200);

    const body = (await res.json()) as { snapshots: { date: string; balance: string }[] };
    expect(body.snapshots.length).toBeGreaterThanOrEqual(2);

    const dates = body.snapshots.map((s) => s.date);
    expect(dates).toContain("2026-02-28");
    expect(dates).toContain("2026-03-01");
  });

  it("GET /api/balance-history?from=2026-03-01 filters by date", async () => {
    const res = await authedFetch("/api/balance-history?from=2026-03-01", token);
    expect(res.status).toBe(200);

    const body = (await res.json()) as { snapshots: { date: string }[] };
    expect(body.snapshots.every((s) => s.date >= "2026-03-01")).toBe(true);
  });

  it("GET /api/account/:id/balance-history returns per-account snapshots", async () => {
    const res = await authedFetch(`/api/account/${accountId}/balance-history`, token);
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      snapshots: { date: string; balance: string; currency: string }[];
    };
    expect(body.snapshots.length).toBeGreaterThanOrEqual(2);
    expect(body.snapshots[0]!.currency).toBe("EUR");
  });

  it("GET /api/account/:id/balance-history for non-existent account returns 404", async () => {
    const res = await authedFetch("/api/account/99999/balance-history", token);
    expect(res.status).toBe(404);
  });
});
