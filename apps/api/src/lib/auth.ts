import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { expo } from "@better-auth/expo";
import { oauthProvider } from "@better-auth/oauth-provider";
import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { apiKey, bearer, jwt, openAPI, twoFactor } from "better-auth/plugins";

import * as authSchema from "../db/schema/auth";
import { seedDefaultCategoriesForUser } from "./categories";
import { createDb, type Database } from "./db";

/**
 * Create a per-request Better Auth instance with its own db connection.
 * Required for Cloudflare Workers where I/O can't be shared across requests.
 */
export function createAuth(db?: Database) {
  const authDb = db ?? createDb();
  const authBaseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000/api/auth";
  const apiOrigin = authBaseUrl.replace(/\/api\/auth\/?$/, "");
  const mcpAudience = `${apiOrigin}/mcp`;
  const passkeyRpId = process.env.PASSKEY_RP_ID ?? new URL(apiOrigin).hostname;

  // Type assertion needed: @better-auth/drizzle-adapter PR build (#6913) targets
  // @better-auth/core@1.5.0-beta.13 while better-auth@1.4.19 uses core@1.4.19
  return betterAuth({
    database: drizzleAdapter(authDb, {
      provider: "pg",
      schema: authSchema,
      // oxlint-disable-next-line typescript/no-explicit-any
    }) as any,
    appName: "Guilders",
    secret: process.env.BETTER_AUTH_SECRET,
    user: {
      deleteUser: {
        enabled: true,
      },
    },
    account: {
      modelName: "user_account",
    },
    emailAndPassword: {
      enabled: true,
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            await seedDefaultCategoriesForUser(authDb, user.id);
          },
        },
      },
    },
    plugins: [
      apiKey({
        enableSessionForAPIKeys: true,
      }),
      twoFactor(),
      jwt(),
      passkey({
        rpID: passkeyRpId,
        rpName: "Guilders",
      }),
      bearer(),
      oauthProvider({
        loginPage: `${apiOrigin.replace(/\/$/, "")}/oauth/sign-in`,
        consentPage: `${apiOrigin.replace(/\/$/, "")}/oauth/consent`,
        validAudiences: [mcpAudience],
        allowDynamicClientRegistration: true,
        allowUnauthenticatedClientRegistration: true,
        silenceWarnings: {
          oauthAuthServerConfig: true,
          openidConfig: true,
        },
      }),
      openAPI({ disableDefaultReference: true }),
      expo({ disableOriginOverride: true }),
    ],
    advanced: {
      disableOriginCheck: process.env.NODE_ENV === "development",
    },
    trustedOrigins: [
      "guilders-mobile://",
      ...(process.env.NODE_ENV === "development"
        ? [
            "http://localhost:3002",
            "http://localhost:3000",
            "exp://",
            "exp://**",
            "exp://192.168.*.*:*/**",
          ]
        : []),
    ],
  });
}

/** Module-level instance for OpenAPI schema generation only */
export const auth = createAuth();
