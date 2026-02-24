// import { env } from "cloudflare:workers";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { expo } from "@better-auth/expo";
import { passkey } from "@better-auth/passkey";
// import { stripe } from "@better-auth/stripe";
import { betterAuth } from "better-auth";
import { apiKey, bearer, openAPI, twoFactor } from "better-auth/plugins";
// import Stripe from "stripe";
import * as authSchema from "../db/schema/auth";
import { db } from "./db";
// import { enqueueUserDeleteCleanupJobs } from "./user-delete-cleanup";

// const stripeClient = new Stripe(env.STRIPE_SECRET_KEY);

export const auth = betterAuth({
  appName: "Guilders",
  secret: process.env.BETTER_AUTH_SECRET,
  user: {
    deleteUser: {
      enabled: true,
      // beforeDelete: async (user) => {
      //   await enqueueUserDeleteCleanupJobs(user.id);
      // },
    },
  },
  account: {
    modelName: "user_account"
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
    // stripe({
    //   stripeClient,
    //   stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET ?? "",
    //   createCustomerOnSignUp: true,
    //   subscription: {
    //     enabled: true,
    //     plans: [
    //       // TODO: Replace with your actual Stripe price IDs
    //       {
    //         name: "pro",
    //         priceId: "price_placeholder_monthly",
    //         annualDiscountPriceId: "price_placeholder_annual",
    //         freeTrial: {
    //           days: 14,
    //         },
    //       },
    //     ],
    //   },
    // }),
  ],
  database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
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
