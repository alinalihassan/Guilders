import { Elysia } from "elysia";
import { auth } from "../lib/auth";

/**
 * Elysia plugin that provides:
 * - Better Auth route handler (mounted at /api/auth/*)
 * - Auth macro for protecting routes
 *
 * Usage:
 * ```ts
 * app
 *   .use(authPlugin)
 *   .get("/protected", async ({ user }) => {
 *     return db.select().from(asset).where(eq(asset.user_id, user.id));
 *   }, { auth: true })
 * ```
 *
 * When `{ auth: true }` is set on a route:
 * - The request is authenticated via Better Auth session/bearer token
 * - `user` and `session` are available on the context
 */
export const authPlugin = new Elysia({ name: "auth" })
  .mount("/api/auth", auth.handler)
  .macro({
    auth: {
      async resolve({ status, request: { headers } }) {
        const session = await auth.api.getSession({ headers });

        if (!session) {
          return status(401);
        }

        return {
          user: session.user,
          session: session.session,
        };
      },
    },
  });
