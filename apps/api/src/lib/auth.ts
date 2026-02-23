import { env } from "cloudflare:workers";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { expo } from "@better-auth/expo";
import { stripe } from "@better-auth/stripe";
import { betterAuth } from "better-auth";
import { bearer, openAPI } from "better-auth/plugins";
import Stripe from "stripe";
import * as authSchema from "../db/schema/auth";
import { db } from "./db";

const stripeClient = new Stripe(env.STRIPE_SECRET_KEY);

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    bearer(),
    openAPI({ disableDefaultReference: true }),
    expo({ disableOriginOverride: true }),
    stripe({
      stripeClient,
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
      createCustomerOnSignUp: true,
      subscription: {
        enabled: true,
        plans: [
          // TODO: Replace with your actual Stripe price IDs
          {
            name: "pro",
            priceId: "price_placeholder_monthly",
            annualDiscountPriceId: "price_placeholder_annual",
            freeTrial: {
              days: 14,
            },
          },
        ],
      },
    }),
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
