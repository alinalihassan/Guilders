import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";

import { session as sessionTable, user as userTable } from "../db/schema/auth";
import { createAuth } from "../lib/auth";
import { createDb, type Database } from "../lib/db";
import { RATE_LIMIT_PERIOD_SECONDS } from "./rate-limit";

const rateLimitExceededBody = {
  error: "rate_limit_exceeded",
  message: "Too many requests",
} as const;

type AuthSession = NonNullable<
  Awaited<ReturnType<ReturnType<typeof createAuth>["api"]["getSession"]>>
>;

export type AuthVariables = {
  user: AuthSession["user"];
  session: AuthSession["session"];
  db: Database;
};

export type AuthEnv = {
  Variables: AuthVariables;
};

/**
 * Authenticate via Better Auth session/API key or a raw session bearer token.
 * Applies the per-user rate limit when the caller is not using x-api-key.
 */
export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const db = createDb();
  const auth = createAuth(db);
  const headers = c.req.raw.headers;
  const session = await auth.api.getSession({ headers });

  if (session) {
    if (!headers.get("x-api-key") && env.RATE_LIMIT) {
      const { success } = await env.RATE_LIMIT.limit({
        key: "user:" + session.user.id,
      });
      if (!success) {
        c.header("Retry-After", String(RATE_LIMIT_PERIOD_SECONDS));
        return c.json(rateLimitExceededBody, 429);
      }
    }
    c.set("user", session.user);
    c.set("session", session.session);
    c.set("db", db);
    await next();
    return;
  }

  const authHeader = headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const result = await db
      .select({
        session: sessionTable,
        user: userTable,
      })
      .from(sessionTable)
      .innerJoin(userTable, eq(sessionTable.userId, userTable.id))
      .where(eq(sessionTable.token, token));

    const row = result[0];
    if (row && new Date(row.session.expiresAt) > new Date()) {
      if (!headers.get("x-api-key") && env.RATE_LIMIT) {
        const { success } = await env.RATE_LIMIT.limit({
          key: "user:" + row.user.id,
        });
        if (!success) {
          c.header("Retry-After", String(RATE_LIMIT_PERIOD_SECONDS));
          return c.json(rateLimitExceededBody, 429);
        }
      }
      c.set("user", row.user);
      c.set("session", row.session);
      c.set("db", db);
      await next();
      return;
    }
  }

  return c.json({ error: "Unauthorized" }, 401);
});
