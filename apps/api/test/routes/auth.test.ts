import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { authedFetch, resetTestDb, selfFetch, signUpTestUser, uniqueTestEmail } from "../helpers";

describe("Authentication", () => {
  let token: string;
  let userId: string;
  let testEmail: string;

  beforeAll(async () => {
    testEmail = uniqueTestEmail("auth");
    const result = await signUpTestUser(testEmail);
    token = result.token;
    userId = result.userId;
  });

  afterAll(async () => {
    await resetTestDb();
  });

  describe("sign-up", () => {
    it("creates a user and returns session token in cookies", () => {
      expect(token).toBeTruthy();
      expect(userId).toBeTruthy();
    });
  });

  describe("session", () => {
    it("GET /api/auth/get-session without auth returns null session", async () => {
      const res = await selfFetch("/api/auth/get-session");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toBeNull();
    });

    it("GET /api/auth/get-session with Bearer token returns user", async () => {
      const res = await authedFetch("/api/auth/get-session", token);
      expect(res.status).toBe(200);

      const body = (await res.json()) as { user?: { id: string; email: string } };
      expect(body.user).toBeDefined();
      expect(body.user!.id).toBe(userId);
      expect(body.user!.email).toBe(testEmail);
    });
  });

  describe("protected routes require auth", () => {
    it("GET /api/account without auth returns 401", async () => {
      const res = await selfFetch("/api/account");
      expect(res.status).toBe(401);
    });

    it("GET /api/transaction without auth returns 401", async () => {
      const res = await selfFetch("/api/transaction");
      expect(res.status).toBe(401);
    });

    it("GET /api/category without auth returns 401", async () => {
      const res = await selfFetch("/api/category");
      expect(res.status).toBe(401);
    });
  });
});
