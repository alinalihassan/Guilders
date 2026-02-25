import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { expo } from "@better-auth/expo";
import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { apiKey, bearer, openAPI, twoFactor } from "better-auth/plugins";

import * as authSchema from "../db/schema/auth";
import { createDb, type Database } from "./db";

/**
 * Create a per-request Better Auth instance with its own db connection.
 * Required for Cloudflare Workers where I/O can't be shared across requests.
 */
export function createAuth(db?: Database) {
  // Type assertion needed: @better-auth/drizzle-adapter PR build (#6913) targets
  // @better-auth/core@1.5.0-beta.13 while better-auth@1.4.19 uses core@1.4.19
  return betterAuth({
    database: drizzleAdapter(db ?? createDb(), {
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
    plugins: [
      apiKey({
        enableSessionForAPIKeys: true,
      }),
      twoFactor(),
      passkey({
        rpID: "guilders",
        rpName: "Guilders",
      }),
      bearer(),
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
