import { apiKey } from "@better-auth/api-key";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { expo } from "@better-auth/expo";
import { oauthProvider } from "@better-auth/oauth-provider";
import { passkey } from "@better-auth/passkey";
import { stripe } from "@better-auth/stripe";
import ChangeEmail from "@guilders/transactional/emails/change-email";
import PasswordResetEmail from "@guilders/transactional/emails/password-reset";
import { betterAuth } from "better-auth";
import { bearer, jwt, openAPI, twoFactor } from "better-auth/plugins";
import { waitUntil } from "cloudflare:workers";
import { Stripe } from "stripe";

import * as authSchema from "../db/schema/auth";
import { seedDefaultCategoriesForUser } from "./categories";
import { createDb, type Database } from "./db";
import { resend } from "./resend";

/**
 * Create a per-request Better Auth instance with its own db connection.
 * Required for Cloudflare Workers where I/O can't be shared across requests.
 */
const stripeSDK = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_placeholder");

function stripePlugin() {
  if (!process.env.STRIPE_PRO_PRICE_ID) {
    console.warn("[Stripe] STRIPE_PRO_PRICE_ID is not set — subscription upgrades will fail");
  }

  return stripe({
    stripeClient: stripeSDK,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
    createCustomerOnSignUp: true,
    subscription: {
      enabled: true,
      plans: [
        {
          name: "pro",
          priceId: process.env.STRIPE_PRO_PRICE_ID ?? "",
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

  return betterAuth({
    baseURL: baseUrl,
    // @ts-ignore TODO: Better Auth 1.5.0 issue, database type is not inferred correctly
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
      },
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
      // @ts-ignore TODO: Better Auth 1.5.0 issue, it's not seen as of type plugin
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
      stripePlugin(),
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

/** Lazily-created instance for OpenAPI schema generation and CLI */
let _auth: ReturnType<typeof createAuth>;
export function getAuth() {
  return (_auth ??= createAuth());
}

export const auth = getAuth();
