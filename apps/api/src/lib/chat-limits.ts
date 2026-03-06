import { and, eq, inArray } from "drizzle-orm";

import { subscription } from "../db/schema/auth";
import { createDb } from "./db";

/** Free tier: messages per period when Stripe is configured and user is not Pro. */
export const CHAT_RATE_LIMIT_FREE = 25;
/** Pro tier (or Stripe not configured): messages per period. */
export const CHAT_RATE_LIMIT_PRO = 500;
/** Rate limit period in days (sliding window). */
export const CHAT_RATE_LIMIT_PERIOD_DAYS = 7;

export function isStripeConfigured(): boolean {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRO_PRICE_ID);
}

export type ChatLimitConfig = {
  isPro: boolean;
  limit: number;
  periodSeconds: number;
  tier: "free" | "pro";
};

/**
 * Resolve tier and rate limit for a user.
 * - If Stripe is not configured → Pro (higher limit).
 * - If Stripe is configured → Pro only when user has active/trialing subscription.
 */
export async function getChatLimitConfig(userId: string): Promise<ChatLimitConfig> {
  const billingEnabled = isStripeConfigured();
  const db = createDb();
  const rows = await db
    .select()
    .from(subscription)
    .where(
      and(
        eq(subscription.referenceId, userId),
        inArray(subscription.status, ["active", "trialing"]),
      ),
    )
    .limit(1);
  const sub = rows[0];

  const isPro = !!sub || !billingEnabled;
  return {
    isPro,
    limit: isPro ? CHAT_RATE_LIMIT_PRO : CHAT_RATE_LIMIT_FREE,
    periodSeconds: CHAT_RATE_LIMIT_PERIOD_DAYS * 24 * 60 * 60,
    tier: isPro ? "pro" : "free",
  };
}
