import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { webhook } from "../../db/schema/webhooks";
import {
  documented,
  jsonError,
  stringIdParamSchema,
  successSchema,
  validate,
} from "../../lib/http";
import { requireAuth, type AuthEnv } from "../../middleware/auth";
import { errorSchema } from "../../utils/error";
import {
  createWebhookSchema,
  updateWebhookSchema,
  webhookCreateResponseSchema,
  webhookListItemSchema,
} from "./types";
import { generateSecret, validateWebhookUrl } from "./utils";

export const webhookRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .get(
    "/",
    documented({
      tags: ["Webhook"],
      summary: "List webhooks",
      description: "List all webhooks for the authenticated user.",
      responses: { 200: z.array(webhookListItemSchema) },
    }),
    async (c) => {
      const user = c.get("user");
      const db = c.get("db");
      const rows = await db.query.webhook.findMany({
        where: { user_id: user.id },
        columns: {
          id: true,
          url: true,
          enabled: true,
          created_at: true,
          updated_at: true,
        },
      });
      return c.json(rows, 200);
    },
  )
  .post(
    "/",
    documented({
      tags: ["Webhook"],
      summary: "Create webhook",
      description:
        "Create a webhook. The secret is returned only once; store it securely to verify signatures.",
      responses: { 200: webhookCreateResponseSchema, 400: errorSchema, 500: errorSchema },
    }),
    validate("json", createWebhookSchema),
    async (c) => {
      const body = c.req.valid("json");
      const user = c.get("user");
      const db = c.get("db");

      const urlValidation = validateWebhookUrl(body.url);
      if (!urlValidation.valid) {
        return jsonError(c, 400, urlValidation.error ?? "Invalid webhook URL");
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
          enabled: true,
          created_at: now,
          updated_at: now,
        })
        .returning();

      if (!created) {
        return jsonError(c, 500, "Failed to create webhook");
      }

      return c.json(
        {
          id: created.id,
          url: created.url,
          enabled: created.enabled,
          created_at: created.created_at,
          updated_at: created.updated_at,
          secret,
        },
        200,
      );
    },
  )
  .patch(
    "/:id",
    documented({
      tags: ["Webhook"],
      summary: "Update webhook",
      description: "Update a webhook's URL or enabled state.",
      responses: {
        200: webhookListItemSchema,
        400: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
    }),
    validate("param", stringIdParamSchema),
    validate("json", updateWebhookSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const user = c.get("user");
      const db = c.get("db");

      const existing = await db.query.webhook.findFirst({
        where: { id, user_id: user.id },
      });

      if (!existing) {
        return jsonError(c, 404, "Webhook not found");
      }

      if (body.url !== undefined) {
        const urlValidation = validateWebhookUrl(body.url);
        if (!urlValidation.valid) {
          return jsonError(c, 400, urlValidation.error ?? "Invalid webhook URL");
        }
      }

      const updates: Partial<typeof webhook.$inferInsert> = {
        updated_at: new Date(),
      };
      if (body.url !== undefined) updates.url = body.url;
      if (body.enabled !== undefined) updates.enabled = body.enabled;

      const [updated] = await db
        .update(webhook)
        .set(updates)
        .where(and(eq(webhook.id, id), eq(webhook.user_id, user.id)))
        .returning({
          id: webhook.id,
          url: webhook.url,
          enabled: webhook.enabled,
          created_at: webhook.created_at,
          updated_at: webhook.updated_at,
        });

      if (!updated) {
        return jsonError(c, 500, "Failed to update webhook");
      }

      return c.json(updated, 200);
    },
  )
  .delete(
    "/:id",
    documented({
      tags: ["Webhook"],
      summary: "Delete webhook",
      description: "Delete a webhook.",
      responses: { 200: successSchema, 404: errorSchema },
    }),
    validate("param", stringIdParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const user = c.get("user");
      const db = c.get("db");
      const deleted = await db
        .delete(webhook)
        .where(and(eq(webhook.id, id), eq(webhook.user_id, user.id)))
        .returning({ id: webhook.id });

      if (deleted.length === 0) {
        return jsonError(c, 404, "Webhook not found");
      }

      return c.json({ success: true }, 200);
    },
  );
