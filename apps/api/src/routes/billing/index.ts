import { Elysia, t } from "elysia";

function isStripeConfigured(): boolean {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRO_PRICE_ID);
}

export const billingRoutes = new Elysia({
  prefix: "/billing",
  detail: { hide: true },
}).get("", () => ({ billingEnabled: isStripeConfigured() }), {
  response: t.Object({
    billingEnabled: t.Boolean(),
  }),
});
