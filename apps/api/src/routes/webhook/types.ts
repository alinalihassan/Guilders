import { z } from "zod";

/** Webhook list item (no secret). Dates may be Date or string (JSON). */
export type Webhook = {
  id: string;
  url: string;
  enabled: boolean;
  created_at: string | Date;
  updated_at: string | Date;
};

export type WebhookCreateResponse = Webhook & { secret: string };

export const createWebhookSchema = z.object({
  url: z.string().min(1),
});

export const updateWebhookSchema = z.object({
  url: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
});

export const webhookListItemSchema = z.object({
  id: z.string(),
  url: z.string(),
  enabled: z.boolean(),
  created_at: z.union([z.string(), z.date()]),
  updated_at: z.union([z.string(), z.date()]),
});

export const webhookCreateResponseSchema = webhookListItemSchema.extend({
  secret: z.string(),
});
