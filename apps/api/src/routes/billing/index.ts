import { Elysia, t } from "elysia";

function isStripeConfigured(): boolean {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRO_PRICE_ID);
}

export const billingRoutes = new Elysia({
  prefix: "/billing",
  detail: {
    tags: ["Billing"],
  },
}).get("", () => ({ billingEnabled: isStripeConfigured() }), {
  response: t.Object({
    billingEnabled: t.Boolean(),
  }),
  detail: {
    summary: "Get billing configuration",
    description:
      "Whether the server has Stripe configured. When false, paid features are offered for free and the subscription page is hidden.",
  },
});
