import { sql } from "drizzle-orm";
import type { MaybePromise } from "elysia/types";

import { app } from "../src/app";
import { getAuth } from "../src/lib/auth";
import { seedDefaultCategoriesForUser } from "../src/lib/categories";
import { createDb } from "../src/lib/db";

export const TEST_ORIGIN = "http://localhost:8787";

export function uniqueTestEmail(prefix = "test"): string {
  return `${prefix}+${Date.now()}-${Math.random().toString(36).slice(2)}@guilders.test`;
}

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

export function selfFetch(path: string, init?: RequestInit): MaybePromise<Response> {
  const request = new Request(`${TEST_ORIGIN}${path}`, init);
  return app.fetch(request);
}

export function authedFetch(
  path: string,
  token: string,
  init?: RequestInit,
): MaybePromise<Response> {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  const request = new Request(`${TEST_ORIGIN}${path}`, { ...init, headers });
  return app.fetch(request);
}

async function getAuthTestUtils() {
  const ctx = await getAuth().$context;
  return ctx.test!;
}

export async function signUpTestUser(
  email = uniqueTestEmail("test"),
  name = "Test User",
): Promise<{ token: string; userId: string }> {
  const authTestUtils = await getAuthTestUtils();
  const user = authTestUtils.createUser({ email, name });
  await authTestUtils.saveUser(user);
  await seedDefaultCategoriesForUser(createDb(), user.id);
  const { token } = await authTestUtils.login({ userId: user.id });
  return { token, userId: user.id };
}

export async function createTestUserWithAccount(options: {
  email?: string;
  account: {
    name: string;
    type?: string;
    subtype?: string;
    value?: string;
    currency?: string;
  };
}): Promise<{ token: string; userId: string; accountId: number }> {
  const email = options.email ?? uniqueTestEmail("test");
  const result = await signUpTestUser(email);

  const accountPayload = {
    type: "asset",
    subtype: "depository",
    value: "1000",
    currency: "EUR",
    ...options.account,
  };

  const res = await authedFetch("/api/account", result.token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(accountPayload),
  });

  if (!res.ok) {
    throw new Error(`Failed to create test account: ${res.status} ${await res.text()}`);
  }

  const body = (await res.json()) as { id: number };
  return { token: result.token, userId: result.userId, accountId: body.id };
}
