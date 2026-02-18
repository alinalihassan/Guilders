import { eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { session as sessionTable, user as userTable } from "../db/schema/auth";
import { auth } from "../lib/auth";
import { db } from "../lib/db";

/**
 * Elysia plugin that provides:
 * - Better Auth route handler (mounted at /api/auth/*)
 * - Auth macro for protecting routes
 * - 401 Unauthorized response model for OpenAPI documentation
 *
 * Usage:
 * ```ts
 * app
 *   .use(authPlugin)
 *   .get("/protected", async ({ user }) => {
 *     return db.query.asset.findMany({
 *       where: {
 *         user_id: user.id,
 *       },
 *     });
 *   }, {
 *     auth: true,
 *     response: {
 *       200: t.Array(selectAssetSchema),
 *       401: errorSchema,
 *     }
 *   })
 * ```
 *
 * When `{ auth: true }` is set on a route:
 * - The request is authenticated via Better Auth session/bearer token
 * - `user` and `session` are available on the context
 * - Returns 401 if authentication fails
 */
export const authPlugin = new Elysia({ name: "auth" })
	.mount("/api/auth", auth.handler)
	.macro({
		auth: {
			async resolve({ status, request: { headers } }) {
				// Try Better Auth's built-in getSession first (handles cookies)
				const session = await auth.api.getSession({ headers });

				if (session) {
					return {
						user: session.user,
						session: session.session,
					};
				}

				console.log(
					"Fallback: manually resolve Bearer token from Authorization header",
				);
				// Fallback: manually resolve Bearer token from Authorization header
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
							return { user, session: sess };
						}
					}
				}

				return status(401);
			},
		},
	});
