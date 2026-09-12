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

export function areProFeaturesFreeForAll(): boolean {
  const value = process.env.PRO_FEATURES_FREE_FOR_ALL?.trim().toLowerCase();
  return value === "true" || value === "1" || value === "yes";
}

/** Stripe is configured and Pro is not unlocked for everyone. */
export function isBillingEnabled(): boolean {
  return isStripeConfigured() && !areProFeaturesFreeForAll();
}

export type ChatLimitConfig = {
  isPro: boolean;
  limit: number;
  periodSeconds: number;
  tier: "free" | "pro";
};

/**
 * Resolve tier and rate limit for a user.
 * - If billing is not enforced → Pro (higher limit).
 * - If billing is enforced → Pro only when user has active/trialing subscription.
 */
export async function getChatLimitConfig(userId: string): Promise<ChatLimitConfig> {
  const billingEnabled = isBillingEnabled();
  if (!billingEnabled) {
    return {
      isPro: true,
      limit: CHAT_RATE_LIMIT_PRO,
      periodSeconds: CHAT_RATE_LIMIT_PERIOD_DAYS * 24 * 60 * 60,
      tier: "pro",
    };
  }

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

  const isPro = !!sub;
  return {
    isPro,
    limit: isPro ? CHAT_RATE_LIMIT_PRO : CHAT_RATE_LIMIT_FREE,
    periodSeconds: CHAT_RATE_LIMIT_PERIOD_DAYS * 24 * 60 * 60,
    tier: isPro ? "pro" : "free",
  };
}
