import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { authedFetch, resetTestDb, selfFetch, signUpTestUser, uniqueTestEmail } from "../helpers";

describe("Category routes", () => {
  let token: string;
  let createdCategoryId: number;

  beforeAll(async () => {
    const result = await signUpTestUser(uniqueTestEmail("category"));
    token = result.token;
  });

  afterAll(async () => {
    await resetTestDb();
  });

  it("GET /api/category without auth returns 401", async () => {
    const res = await selfFetch("/api/category");
    expect(res.status).toBe(401);
  });

  it("GET /api/category returns seeded default categories", async () => {
    const res = await authedFetch("/api/category", token);
    expect(res.status).toBe(200);

    const body = (await res.json()) as { name: string }[];
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  it("POST /api/category creates a new category", async () => {
    const res = await authedFetch("/api/category", token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Integration Test Category",
        color: "#ff0000",
        classification: "expense",
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      id: number;
      name: string;
      color: string;
      classification: string;
    };
    expect(body.name).toBe("Integration Test Category");
    expect(body.color).toBe("#ff0000");
    expect(body.classification).toBe("expense");
    createdCategoryId = body.id;
  });

  it("POST /api/category with same name returns existing", async () => {
    const res = await authedFetch("/api/category", token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Integration Test Category",
        classification: "expense",
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: number };
    expect(body.id).toBe(createdCategoryId);
  });

  it("PUT /api/category/:id updates the category", async () => {
    const res = await authedFetch(`/api/category/${createdCategoryId}`, token, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Updated Category",
        color: "#00ff00",
        classification: "income",
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { name: string; color: string; classification: string };
    expect(body.name).toBe("Updated Category");
    expect(body.color).toBe("#00ff00");
    expect(body.classification).toBe("income");
  });

  it("DELETE /api/category/:id deletes the category", async () => {
    const res = await authedFetch(`/api/category/${createdCategoryId}`, token, {
      method: "DELETE",
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });

  it("DELETE /api/category/:id for non-existent returns 404", async () => {
    const res = await authedFetch("/api/category/99999", token, {
      method: "DELETE",
    });
    expect(res.status).toBe(404);
  });
});
