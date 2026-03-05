import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { authedFetch, resetTestDb, selfFetch, signUpTestUser } from "../helpers";

describe("Account routes", () => {
  let token: string;
  let createdAccountId: number;

  beforeAll(async () => {
    const result = await signUpTestUser("account-test@guilders.test");
    token = result.token;
  });

  afterAll(async () => {
    await resetTestDb();
  });

  it("GET /api/account without auth returns 401", async () => {
    const res = await selfFetch("/api/account");
    expect(res.status).toBe(401);
  });

  it("GET /api/account returns empty array for new user", async () => {
    const res = await authedFetch("/api/account", token);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(0);
  });

  it("POST /api/account creates a new account", async () => {
    const res = await authedFetch("/api/account", token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Savings",
        type: "asset",
        subtype: "depository",
        value: "5000",
        currency: "EUR",
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: number; name: string; type: string; value: string };
    expect(body.name).toBe("Test Savings");
    expect(body.type).toBe("asset");
    expect(parseFloat(body.value)).toBe(5000);
    createdAccountId = body.id;
  });

  it("GET /api/account lists the created account", async () => {
    const res = await authedFetch("/api/account", token);
    expect(res.status).toBe(200);

    const body = (await res.json()) as { id: number; name: string }[];
    expect(body).toHaveLength(1);
    expect(body[0]!.name).toBe("Test Savings");
  });

  it("GET /api/account/:id returns the account with children", async () => {
    const res = await authedFetch(`/api/account/${createdAccountId}`, token);
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      account: { id: number; name: string };
      children: unknown[];
    };
    expect(body.account.id).toBe(createdAccountId);
    expect(body.account.name).toBe("Test Savings");
    expect(body.children).toHaveLength(0);
  });

  it("PUT /api/account/:id updates the account", async () => {
    const res = await authedFetch(`/api/account/${createdAccountId}`, token, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Updated Savings", type: "asset", subtype: "depository", value: "7500", currency: "EUR" }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { name: string; value: string };
    expect(body.name).toBe("Updated Savings");
    expect(parseFloat(body.value)).toBe(7500);
  });

  it("GET /api/account/:id for non-existent account returns 404", async () => {
    const res = await authedFetch("/api/account/99999", token);
    expect(res.status).toBe(404);
  });

  it("DELETE /api/account/:id deletes the account", async () => {
    const res = await authedFetch(`/api/account/${createdAccountId}`, token, {
      method: "DELETE",
    });
    expect(res.status).toBe(200);

    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });

  it("GET /api/account returns empty after deletion", async () => {
    const res = await authedFetch("/api/account", token);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveLength(0);
  });

  it("POST /api/account auto-calculates liability type", async () => {
    const res = await authedFetch("/api/account", token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Credit Card",
        type: "liability",
        subtype: "creditcard",
        value: "1000",
        currency: "EUR",
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { type: string; value: string };
    expect(body.type).toBe("liability");
    expect(parseFloat(body.value)).toBe(-1000);
  });
});
