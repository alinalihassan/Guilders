import { and, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";

import { webhook } from "../../db/schema/webhooks";
import { authPlugin } from "../../middleware/auth";
import {
  createWebhookSchema,
  updateWebhookSchema,
  webhookCreateResponseSchema,
  webhookIdParamSchema,
  webhookListItemSchema,
} from "./types";
import { generateSecret, maskUrl, validateWebhookUrl } from "./utils";

export const webhookRoutes = new Elysia({
  prefix: "/webhook",
  detail: {
    tags: ["Webhook"],
    security: [{ apiKeyAuth: [] }, { bearerAuth: [] }],
  },
})
  .use(authPlugin)
  .model({
    WebhookListItem: webhookListItemSchema,
    WebhookCreateResponse: webhookCreateResponseSchema,
  })
  .get(
    "",
    async ({ user, db }) => {
      const rows = await db.query.webhook.findMany({
        where: { user_id: user.id },
        columns: {
          id: true,
          url: true,
          description: true,
          enabled: true,
          created_at: true,
          updated_at: true,
        },
      });
      return rows.map((row) => ({
        ...row,
        url: maskUrl(row.url),
      }));
    },
    {
      auth: true,
      response: t.Array(t.Ref("#/components/schemas/WebhookListItem")),
      detail: {
        summary: "List webhooks",
        description: "List all webhooks for the authenticated user. URLs are masked.",
      },
    },
  )
  .post(
    "",
    async ({ body, user, db, set }) => {
      const urlValidation = validateWebhookUrl(body.url);
      if (!urlValidation.valid) {
        set.status = 400;
        return { error: urlValidation.error };
      }

      const id = crypto.randomUUID();
      const secret = generateSecret();
      const now = new Date();

      const [created] = await db
        .insert(webhook)
        .values({
          id,
          user_id: user.id,
          url: body.url,
          secret,
          description: body.description ?? null,
          enabled: true,
          created_at: now,
          updated_at: now,
        })
        .returning();

      if (!created) {
        set.status = 500;
        return { error: "Failed to create webhook" };
      }

      return {
        id: created.id,
        url: created.url,
        description: created.description,
        enabled: created.enabled,
        created_at: created.created_at,
        updated_at: created.updated_at,
        secret,
      };
    },
    {
      auth: true,
      body: createWebhookSchema,
      detail: {
        summary: "Create webhook",
        description:
          "Create a webhook. The secret is returned only once; store it securely to verify signatures.",
      },
    },
  )
  .patch(
    "/:id",
    async ({ params, body, user, db, set }) => {
      const existing = await db.query.webhook.findFirst({
        where: { id: params.id, user_id: user.id },
      });

      if (!existing) {
        set.status = 404;
        return { error: "Webhook not found" };
      }

      if (body.url !== undefined) {
        const urlValidation = validateWebhookUrl(body.url);
        if (!urlValidation.valid) {
          set.status = 400;
          return { error: urlValidation.error };
        }
      }

      const updates: Partial<typeof webhook.$inferInsert> = {
        updated_at: new Date(),
      };
      if (body.url !== undefined) updates.url = body.url;
      if (body.description !== undefined) updates.description = body.description;
      if (body.enabled !== undefined) updates.enabled = body.enabled;

      const [updated] = await db
        .update(webhook)
        .set(updates)
        .where(and(eq(webhook.id, params.id), eq(webhook.user_id, user.id)))
        .returning({
          id: webhook.id,
          url: webhook.url,
          description: webhook.description,
          enabled: webhook.enabled,
          created_at: webhook.created_at,
          updated_at: webhook.updated_at,
        });

      if (!updated) {
        set.status = 500;
        return { error: "Failed to update webhook" };
      }

      return {
        ...updated,
        url: maskUrl(updated.url),
      };
    },
    {
      auth: true,
      params: webhookIdParamSchema,
      body: updateWebhookSchema,
      detail: {
        summary: "Update webhook",
        description: "Update a webhook's URL, description, or enabled state.",
      },
    },
  )
  .delete(
    "/:id",
    async ({ params, user, db, set }) => {
      const deleted = await db
        .delete(webhook)
        .where(and(eq(webhook.id, params.id), eq(webhook.user_id, user.id)))
        .returning({ id: webhook.id });

      if (deleted.length === 0) {
        set.status = 404;
        return { error: "Webhook not found" };
      }

      return { success: true };
    },
    {
      auth: true,
      params: webhookIdParamSchema,
      detail: {
        summary: "Delete webhook",
        description: "Delete a webhook.",
      },
    },
  );
