import { eq } from "drizzle-orm";
import { Elysia } from "elysia";

import { session as sessionTable, user as userTable } from "../db/schema/auth";
import { createAuth } from "../lib/auth";
import { createDb } from "../lib/db";

/**
 * Elysia plugin that provides auth macro for protecting routes.
 *
 * When `{ auth: true }` is set on a route:
 * - A per-request `db` connection and `auth` instance are created
 * - The request is authenticated via Better Auth session/bearer token
 * - `user`, `session`, and `db` are available on the context
 * - Returns 401 if authentication fails
 */
export const authPlugin = new Elysia({ name: "auth" }).macro({
  auth: {
    async resolve({ status, request: { headers } }) {
      const db = createDb();
      const auth = createAuth(db);
      const session = await auth.api.getSession({ headers });

      if (session) {
        return { user: session.user, session: session.session, db };
      }

      console.log("Fallback: manually resolve Bearer token from Authorization header");
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

        if (result.length > 0 && result[0]) {
          const { session: sess, user } = result[0];

          if (new Date(sess.expiresAt) > new Date()) {
            return { user, session: sess, db };
          }
        }
      }

      return status(401);
    },
  },
});
