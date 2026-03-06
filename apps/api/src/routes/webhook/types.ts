import { t } from "elysia";

export const webhookIdParamSchema = t.Object({
  id: t.String({ minLength: 1, maxLength: 255 }),
});

export const createWebhookSchema = t.Object({
  url: t.String({ minLength: 1 }),
  description: t.Optional(t.Union([t.String(), t.Null()])),
});

export const updateWebhookSchema = t.Object({
  url: t.Optional(t.String({ minLength: 1 })),
  description: t.Optional(t.Union([t.String(), t.Null()])),
  enabled: t.Optional(t.Boolean()),
});

export const webhookListItemSchema = t.Object({
  id: t.String(),
  url: t.String(),
  description: t.Union([t.String(), t.Null()]),
  enabled: t.Boolean(),
  created_at: t.Date(),
  updated_at: t.Date(),
});

export const webhookCreateResponseSchema = t.Object({
  id: t.String(),
  url: t.String(),
  description: t.Union([t.String(), t.Null()]),
  enabled: t.Boolean(),
  created_at: t.Date(),
  updated_at: t.Date(),
  secret: t.String(),
});
