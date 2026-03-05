import { unzipSync } from "fflate";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { authedFetch, resetTestDb, selfFetch, signUpTestUser, uniqueTestEmail } from "../helpers";

describe("Export routes", () => {
  let token: string;

  beforeAll(async () => {
    const result = await signUpTestUser(uniqueTestEmail("export"));
    token = result.token;
  });

  afterAll(async () => {
    await resetTestDb();
  });

  it("GET /api/export without auth returns 401", async () => {
    const res = await selfFetch("/api/export");
    expect(res.status).toBe(401);
  });

  it("GET /api/export returns ZIP with expected entries", async () => {
    const res = await authedFetch("/api/export", token);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/zip");
    expect(res.headers.get("content-disposition")).toContain("attachment");
    expect(res.headers.get("content-disposition")).toContain(".zip");

    const arrayBuffer = await res.arrayBuffer();
    const unzipped = unzipSync(new Uint8Array(arrayBuffer));

    expect(unzipped["accounts.json"]).toBeDefined();
    expect(unzipped["transactions.json"]).toBeDefined();
    expect(unzipped["categories.json"]).toBeDefined();
    expect(unzipped["conversations.json"]).toBeDefined();
    expect(unzipped["documents.json"]).toBeDefined();

    const accounts = JSON.parse(new TextDecoder().decode(unzipped["accounts.json"])) as unknown[];
    const transactions = JSON.parse(
      new TextDecoder().decode(unzipped["transactions.json"]),
    ) as unknown[];
    const categories = JSON.parse(
      new TextDecoder().decode(unzipped["categories.json"]),
    ) as unknown[];
    const documents = JSON.parse(new TextDecoder().decode(unzipped["documents.json"])) as unknown[];

    expect(Array.isArray(accounts)).toBe(true);
    expect(Array.isArray(transactions)).toBe(true);
    expect(Array.isArray(categories)).toBe(true);
    expect(Array.isArray(documents)).toBe(true);

    for (const a of accounts as Record<string, unknown>[]) {
      expect(a).not.toHaveProperty("institution_connection_id");
      expect(a).not.toHaveProperty("provider_account_id");
    }
  });
});
