import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { authedFetch, resetTestDb, selfFetch, signUpTestUser } from "../helpers";

describe("Document routes", () => {
  let token: string;

  beforeAll(async () => {
    const result = await signUpTestUser("document-test@guilders.test");
    token = result.token;
  });

  afterAll(async () => {
    await resetTestDb();
  });

  it("GET /api/document without auth returns 401", async () => {
    const res = await selfFetch("/api/document");
    expect(res.status).toBe(401);
  });

  it("GET /api/document returns empty list for new user", async () => {
    const res = await authedFetch("/api/document", token);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(0);
  });

  it("GET /api/document/:id for non-existent returns 404", async () => {
    const res = await authedFetch("/api/document/99999", token);
    expect(res.status).toBe(404);
  });

  it("DELETE /api/document/:id for non-existent returns 404", async () => {
    const res = await authedFetch("/api/document/99999", token, { method: "DELETE" });
    expect(res.status).toBe(404);
  });
});
