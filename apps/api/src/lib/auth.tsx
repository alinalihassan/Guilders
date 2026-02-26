import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { expo } from "@better-auth/expo";
import { oauthProvider } from "@better-auth/oauth-provider";
import { passkey } from "@better-auth/passkey";
import ChangeEmail from "@guilders/transactional/emails/change-email";
import PasswordResetEmail from "@guilders/transactional/emails/password-reset";
import { betterAuth } from "better-auth";
import { apiKey, bearer, jwt, openAPI, twoFactor } from "better-auth/plugins";
import { env } from "cloudflare:workers";

import * as authSchema from "../db/schema/auth";
import { seedDefaultCategoriesForUser } from "./categories";
import { createDb, type Database } from "./db";
import { resend } from "./resend";

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
      changeEmail: {
        enabled: true,
      },
      deleteUser: {
        enabled: true,
      },
    },
    account: {
      modelName: "user_account",
    },
    emailVerification: {
      // Required to send the verification email
      sendVerificationEmail: async ({ user, url }) => {
        resend.emails.send({
          from: "Guilders <noreply@guilders.app>",
          to: user.email,
          subject: "Verify your new email",
          react: (
            <ChangeEmail dashboardUrl={env.DASHBOARD_URL} newEmail={user.email} verifyUrl={url} />
          ),
        });
      },
    },
    emailAndPassword: {
      enabled: true,
      sendResetPassword: async ({ user, url }) => {
        resend.emails.send({
          from: "Guilders <noreply@guilders.app>",
          to: user.email,
          subject: "Reset your password",
          react: (
            <PasswordResetEmail
              dashboardUrl={env.DASHBOARD_URL}
              userEmail={user.email}
              resetUrl={url}
            />
          ),
        });
      },
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
            // Guilders local development
            "http://localhost:3002",
            "http://localhost:3000",
            // @modelcontextprotocol/inspector
            "http://localhost:6274",
            "http://localhost:6277",
            // Expo
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
