import { Hono } from "hono";
import { z } from "zod";

import { documented } from "../../lib/http";

function isStripeConfigured(): boolean {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRO_PRICE_ID);
}

const billingResponseSchema = z.object({
  billingEnabled: z.boolean(),
});

export const billingRoutes = new Hono().get(
  "/",
  documented({
    hide: true,
    summary: "Billing status",
    responses: { 200: billingResponseSchema },
  }),
  (c) => c.json({ billingEnabled: isStripeConfigured() }, 200),
);
