import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { authedFetch, resetTestDb, selfFetch, signUpTestUser, uniqueTestEmail } from "../helpers";

describe("Currency routes", () => {
  let token: string;

  beforeAll(async () => {
    const result = await signUpTestUser(uniqueTestEmail("currency"));
    token = result.token;
  });

  afterAll(async () => {
    await resetTestDb();
  });

  it("GET /api/currency without auth returns 401", async () => {
    const res = await selfFetch("/api/currency");
    expect(res.status).toBe(401);
  });

  it("GET /api/currency returns seeded currencies", async () => {
    const res = await authedFetch("/api/currency", token);
    expect(res.status).toBe(200);

    const body = (await res.json()) as { code: string; name: string }[];
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(3);

    const codes = body.map((c) => c.code);
    expect(codes).toContain("EUR");
    expect(codes).toContain("USD");
    expect(codes).toContain("GBP");
  });

  it("GET /api/currency/:code returns a single currency", async () => {
    const res = await authedFetch("/api/currency/EUR", token);
    expect(res.status).toBe(200);

    const body = (await res.json()) as { code: string; name: string };
    expect(body.code).toBe("EUR");
    expect(body.name).toBe("Euro");
  });

  it("GET /api/currency/:code with unknown code returns 404", async () => {
    const res = await authedFetch("/api/currency/ZZZ", token);
    expect(res.status).toBe(404);
  });
});
