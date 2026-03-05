import { sql } from "drizzle-orm";

import { app } from "../src/app";
import { createDb } from "../src/lib/db";

export const TEST_ORIGIN = "http://localhost:8787";

/**
 * Truncate all user-data tables in the test database (PGLite).
 * Call in afterAll() to isolate test suites.
 */
export async function resetTestDb(): Promise<void> {
  const db = createDb();
  await db.execute(sql`
    TRUNCATE TABLE
      "oauth_access_token", "oauth_refresh_token", "oauth_consent", "oauth_client",
      "balance_snapshot", "document", "transaction", "account", "category",
      "institution_connection", "provider_connection", "institution", "provider",
      "rate", "currency", "country", "passkey", "two_factor", "apikey",
      "verification", "subscription", "session", "user_account", "conversation", "user"
    CASCADE
  `);
}

export function selfFetch(path: string, init?: RequestInit): Promise<Response> {
  const request = new Request(`${TEST_ORIGIN}${path}`, init);
  return app.fetch(request);
}

export function authedFetch(path: string, token: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  const request = new Request(`${TEST_ORIGIN}${path}`, { ...init, headers });
  return app.fetch(request);
}

/**
 * Sign up a test user via Better Auth and return the session token.
 */
export async function signUpTestUser(
  email = "test@guilders.test",
  password = "TestPassword123!",
  name = "Test User",
): Promise<{ token: string; userId: string }> {
  const res = await selfFetch("/api/auth/sign-up/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sign-up failed (${res.status}): ${text}`);
  }

  const body = (await res.json()) as { token?: string; user?: { id: string } };

  const setCookie = res.headers.get("set-cookie") ?? "";
  const tokenMatch = setCookie.match(/better-auth\.session_token=([^;]+)/);
  const sessionToken = tokenMatch?.[1];

  if (!sessionToken) {
    throw new Error("No session token in sign-up response cookies");
  }

  const userId = body.user?.id;
  if (!userId) {
    throw new Error("No user ID in sign-up response");
  }

  return { token: sessionToken, userId };
}
