import { apiKey } from "@better-auth/api-key";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { expo } from "@better-auth/expo";
import { oauthProvider } from "@better-auth/oauth-provider";
import { passkey } from "@better-auth/passkey";
import { stripe } from "@better-auth/stripe";
import ChangeEmail from "@guilders/transactional/emails/change-email";
import PasswordResetEmail from "@guilders/transactional/emails/password-reset";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { bearer, jwt, openAPI, testUtils, twoFactor } from "better-auth/plugins";
import { env as cfEnv, waitUntil } from "cloudflare:workers";
import { Stripe } from "stripe";

import * as authSchema from "../db/schema/auth";
import { seedDefaultCategoriesForUser } from "./categories";
import { createDb, type Database } from "./db";
import { resend } from "./resend";
import { enqueueUserDeleteCleanupJobs } from "./user-delete-cleanup";

/**
 * Create a per-request Better Auth instance with its own db connection.
 * Required for Cloudflare Workers where I/O can't be shared across requests.
 */
function stripePlugin() {
  const secret = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRO_PRICE_ID;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !priceId || !webhookSecret) return null;

  const stripeSDK = new Stripe(secret);
  return stripe({
    stripeClient: stripeSDK,
    stripeWebhookSecret: webhookSecret,
    createCustomerOnSignUp: true,
    subscription: {
      enabled: true,
      plans: [
        {
          name: "pro",
          priceId,
          freeTrial: {
            days: 14,
          },
        },
      ],
    },
  });
}

export function createAuth(db?: Database) {
  const authDb = db ?? createDb();
  const baseUrl = process.env.BACKEND_URL;
  const mcpAudience = `${baseUrl}/mcp`;
  const passkeyRpId = new URL(baseUrl).hostname;
  const stripeAuth = stripePlugin();

  return betterAuth({
    baseURL: baseUrl,
    database: drizzleAdapter(authDb, {
      provider: "pg",
      schema: authSchema,
    }),
    appName: "Guilders",
    secret: process.env.BETTER_AUTH_SECRET,
    user: {
      additionalFields: {
        currency: {
          type: "string",
          required: false,
          defaultValue: "EUR",
        },
        timeFormat: {
          type: "string",
          required: false,
          defaultValue: "24",
        },
      },
      changeEmail: {
        enabled: true,
      },
      deleteUser: {
        enabled: true,
        beforeDelete: async (user) => {
          try {
            await enqueueUserDeleteCleanupJobs(cfEnv, user.id);
          } catch (error) {
            console.error("[deleteUser] Failed to enqueue cleanup jobs:", {
              userId: user.id,
              error: error instanceof Error ? error.message : error,
            });
            throw new APIError("INTERNAL_SERVER_ERROR", {
              message: "Failed to prepare account deletion. Please try again.",
            });
          }
        },
      },
    },
    account: {
      modelName: "user_account",
    },
    emailVerification: {
      // Required to send the verification email
      sendVerificationEmail: async ({ user, url }) => {
        waitUntil(
          resend.emails.send({
            from: "Guilders <noreply@guilders.app>",
            to: user.email,
            subject: "Verify your new email",
            react: (
              <ChangeEmail
                dashboardUrl={process.env.DASHBOARD_URL}
                newEmail={user.email}
                verifyUrl={url}
              />
            ),
          }),
        );
      },
    },
    emailAndPassword: {
      enabled: true,
      sendResetPassword: async ({ user, url }) => {
        waitUntil(
          resend.emails.send({
            from: "Guilders <noreply@guilders.app>",
            to: user.email,
            subject: "Reset your password",
            react: (
              <PasswordResetEmail
                dashboardUrl={process.env.DASHBOARD_URL}
                userEmail={user.email}
                resetUrl={url}
              />
            ),
          }),
        );
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
      apiKey(),
      twoFactor(),
      jwt(),
      passkey({
        rpID: passkeyRpId,
        rpName: "Guilders",
      }),
      bearer(),
      oauthProvider({
        loginPage: `${baseUrl}/oauth/sign-in`,
        consentPage: `${baseUrl}/oauth/consent`,
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
      ...(stripeAuth ? [stripeAuth] : []),
      ...(process.env.VITEST === "true" ? [testUtils()] : []),
    ],
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

/** Lazily-created instance for OpenAPI schema generation and CLI */
let _auth: ReturnType<typeof createAuth>;
export function getAuth() {
  return (_auth ??= createAuth());
}
