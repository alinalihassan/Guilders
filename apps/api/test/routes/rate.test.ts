import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { rate } from "../../src/db/schema/rates";
import { createDb } from "../../src/lib/db";
import { authedFetch, resetTestDb, selfFetch, signUpTestUser } from "../helpers";

describe("Rate routes", () => {
  let token: string;

  beforeAll(async () => {
    const result = await signUpTestUser("rate-test@guilders.test");
    token = result.token;

    const db = createDb();
    await db
      .insert(rate)
      .values([
        { currency_code: "USD", date: "2026-03-01", rate: "1.08500000" },
        { currency_code: "GBP", date: "2026-03-01", rate: "0.83200000" },
        { currency_code: "USD", date: "2026-03-02", rate: "1.09000000" },
        { currency_code: "GBP", date: "2026-03-02", rate: "0.83500000" },
      ])
      .onConflictDoNothing();
  });

  afterAll(async () => {
    await resetTestDb();
  });

  it("GET /api/rate without auth returns 401", async () => {
    const res = await selfFetch("/api/rate");
    expect(res.status).toBe(401);
  });

  it("GET /api/rate returns latest rates (default base EUR)", async () => {
    const res = await authedFetch("/api/rate", token);
    expect(res.status).toBe(200);

    const body = (await res.json()) as { currency_code: string; rate: string }[];
    expect(body.length).toBeGreaterThanOrEqual(2);

    const usd = body.find((r) => r.currency_code === "USD");
    expect(usd).toBeDefined();
  });

  it("GET /api/rate?date=2026-03-01 returns rates for that date", async () => {
    const res = await authedFetch("/api/rate?date=2026-03-01", token);
    expect(res.status).toBe(200);

    const body = (await res.json()) as { currency_code: string; rate: string }[];
    const usd = body.find((r) => r.currency_code === "USD");
    expect(usd).toBeDefined();
    expect(usd!.rate).toBe("1.08500000");
  });

  it("GET /api/rate?base=USD converts rates", async () => {
    const res = await authedFetch("/api/rate?base=USD", token);
    expect(res.status).toBe(200);

    const body = (await res.json()) as { currency_code: string; rate: string }[];
    const usd = body.find((r) => r.currency_code === "USD");
    expect(parseFloat(usd!.rate)).toBeCloseTo(1.0, 5);
  });

  it("GET /api/rate/:code returns a single rate", async () => {
    const res = await authedFetch("/api/rate/USD", token);
    expect(res.status).toBe(200);

    const body = (await res.json()) as { currency_code: string };
    expect(body.currency_code).toBe("USD");
  });

  it("GET /api/rate/:code with unknown code returns 404", async () => {
    const res = await authedFetch("/api/rate/ZZZ", token);
    expect(res.status).toBe(404);
  });
});
