import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDb } from "../../src/lib/db";
import { country } from "../../src/db/schema/countries";
import { authedFetch, resetTestDb, selfFetch, signUpTestUser } from "../helpers";

describe("Country routes", () => {
  let token: string;

  beforeAll(async () => {
    const result = await signUpTestUser("country-test@guilders.test");
    token = result.token;

    const db = createDb();
    await db
      .insert(country)
      .values([
        { code: "NL", name: "Netherlands", currency_code: "EUR" },
        { code: "US", name: "United States", currency_code: "USD" },
        { code: "GB", name: "United Kingdom", currency_code: "GBP" },
      ])
      .onConflictDoNothing();
  });

  afterAll(async () => {
    await resetTestDb();
  });

  it("GET /api/country without auth returns 401", async () => {
    const res = await selfFetch("/api/country");
    expect(res.status).toBe(401);
  });

  it("GET /api/country returns seeded countries", async () => {
    const res = await authedFetch("/api/country", token);
    expect(res.status).toBe(200);

    const body = (await res.json()) as { code: string; name: string }[];
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(3);

    const codes = body.map((c) => c.code);
    expect(codes).toContain("NL");
    expect(codes).toContain("US");
  });
});
