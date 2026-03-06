import { t } from "elysia";

/** Webhook list item (no secret). Dates may be Date (Eden inferred) or string (JSON). */
export type Webhook = {
  id: string;
  url: string;
  enabled: boolean;
  created_at: string | Date;
  updated_at: string | Date;
};

export type WebhookCreateResponse = Webhook & { secret: string };

export const webhookIdParamSchema = t.Object({
  id: t.String({ minLength: 1, maxLength: 255 }),
});

export const createWebhookSchema = t.Object({
  url: t.String({ minLength: 1 }),
});

export const updateWebhookSchema = t.Object({
  url: t.Optional(t.String({ minLength: 1 })),
  enabled: t.Optional(t.Boolean()),
});

export const webhookListItemSchema = t.Object({
  id: t.String(),
  url: t.String(),
  enabled: t.Boolean(),
  created_at: t.Date(),
  updated_at: t.Date(),
});

export const webhookCreateResponseSchema = t.Object({
  id: t.String(),
  url: t.String(),
  enabled: t.Boolean(),
  created_at: t.Date(),
  updated_at: t.Date(),
  secret: t.String(),
});
