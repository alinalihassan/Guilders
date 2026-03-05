import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { authedFetch, resetTestDb, selfFetch, signUpTestUser } from "../helpers";

describe("Transaction routes", () => {
  let token: string;
  let accountId: number;
  let transactionId: number;

  beforeAll(async () => {
    const result = await signUpTestUser("transaction-test@guilders.test");
    token = result.token;

    const accountRes = await authedFetch("/api/account", token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Checking Account",
        type: "asset",
        subtype: "depository",
        value: "1000",
        currency: "EUR",
      }),
    });

    if (!accountRes.ok) {
      throw new Error(
        `Failed to create test account: ${accountRes.status} ${await accountRes.text()}`,
      );
    }

    const accountBody = (await accountRes.json()) as { id: number };
    accountId = accountBody.id;
  });

  afterAll(async () => {
    await resetTestDb();
  });

  it("GET /api/transaction without auth returns 401", async () => {
    const res = await selfFetch("/api/transaction");
    expect(res.status).toBe(401);
  });

  it("GET /api/transaction returns empty for new account", async () => {
    const res = await authedFetch("/api/transaction", token);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(0);
  });

  it("POST /api/transaction creates a transaction and updates account value", async () => {
    const res = await authedFetch("/api/transaction", token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        account_id: accountId,
        amount: "-50.00",
        currency: "EUR",
        date: "2026-03-01",
        description: "Grocery shopping",
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      id: number;
      amount: string;
      description: string;
      account_id: number;
    };
    expect(parseFloat(body.amount)).toBe(-50);
    expect(body.description).toBe("Grocery shopping");
    expect(body.account_id).toBe(accountId);
    transactionId = body.id;

    const accountRes = await authedFetch(`/api/account/${accountId}`, token);
    if (!accountRes.ok) {
      throw new Error(
        `Failed to get test account: ${accountRes.status} ${await accountRes.text()}`,
      );
    }
    const accountBody = (await accountRes.json()) as { account: { value: string } };
    expect(parseFloat(accountBody.account.value)).toBe(950);
  });

  it("GET /api/transaction lists the created transaction", async () => {
    const res = await authedFetch("/api/transaction", token);
    expect(res.status).toBe(200);

    const body = (await res.json()) as { id: number }[];
    expect(body).toHaveLength(1);
    expect(body[0]!.id).toBe(transactionId);
  });

  it("GET /api/transaction/:id returns the transaction", async () => {
    const res = await authedFetch(`/api/transaction/${transactionId}`, token);
    expect(res.status).toBe(200);

    const body = (await res.json()) as { id: number; description: string };
    expect(body.id).toBe(transactionId);
    expect(body.description).toBe("Grocery shopping");
  });

  it("POST /api/transaction rejects mismatched currency", async () => {
    const res = await authedFetch("/api/transaction", token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        account_id: accountId,
        amount: "-25.00",
        currency: "USD",
        date: "2026-03-01",
        description: "Wrong currency",
      }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("currency");
  });

  it("DELETE /api/transaction/:id deletes and reverts account value", async () => {
    const res = await authedFetch(`/api/transaction/${transactionId}`, token, {
      method: "DELETE",
    });
    expect(res.status).toBe(200);

    const accountRes = await authedFetch(`/api/account/${accountId}`, token);

    if (!accountRes.ok) {
      throw new Error(
        `Failed to get test account: ${accountRes.status} ${await accountRes.text()}`,
      );
    }

    const accountBody = (await accountRes.json()) as { account: { value: string } };
    expect(parseFloat(accountBody.account.value)).toBe(1000);
  });
});
