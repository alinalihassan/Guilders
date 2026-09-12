import { Hono } from "hono";
import { z } from "zod";

import { isBillingEnabled } from "../../lib/chat-limits";
import { documented } from "../../lib/http";

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
  (c) => c.json({ billingEnabled: isBillingEnabled() }, 200),
);
