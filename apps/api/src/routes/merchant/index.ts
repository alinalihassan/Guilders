import { env } from "cloudflare:workers";
import { and, asc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { document } from "../../db/schema/documents";
import type { DocumentEntityTypeEnum } from "../../db/schema/enums";
import { merchant, selectMerchantSchema } from "../../db/schema/merchants";
import { cleanupEntityDocuments } from "../../lib/cleanup-documents";
import { documented, idParamSchema, jsonError, successSchema, validate } from "../../lib/http";
import { requireAuth, type AuthEnv } from "../../middleware/auth";
import { errorSchema } from "../../utils/error";
import { createMerchantSchema } from "./types";

export const merchantRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .get(
    "/",
    documented({
      tags: ["Merchants"],
      summary: "Get merchants",
      description: "Retrieve all merchants for the authenticated user.",
      responses: { 200: z.array(selectMerchantSchema) },
    }),
    async (c) => {
      const user = c.get("user");
      const db = c.get("db");
      const merchants = await db.query.merchant.findMany({
        where: { user_id: user.id },
        orderBy: (m) => asc(m.name),
      });
      return c.json(merchants, 200);
    },
  )
  .post(
    "/",
    documented({
      tags: ["Merchants"],
      summary: "Create merchant",
      description: "Create a new merchant for the authenticated user",
      responses: { 200: selectMerchantSchema, 400: errorSchema, 500: errorSchema },
    }),
    validate("json", createMerchantSchema),
    async (c) => {
      const body = c.req.valid("json");
      const user = c.get("user");
      const db = c.get("db");

      const normalizedName = body.name.trim();
      if (!normalizedName) {
        return jsonError(c, 400, "Merchant name is required");
      }

      const existingMerchant = await db.query.merchant.findFirst({
        where: {
          user_id: user.id,
          name: normalizedName,
        },
      });

      if (existingMerchant) {
        return c.json(existingMerchant, 200);
      }

      const [newMerchant] = await db
        .insert(merchant)
        .values({
          user_id: user.id,
          name: normalizedName,
          logo_url: body.logo_url ?? null,
          website_url: body.website_url ?? null,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();

      if (!newMerchant) {
        return jsonError(c, 500, "Failed to create merchant");
      }

      return c.json(newMerchant, 200);
    },
  )
  .put(
    "/:id",
    documented({
      tags: ["Merchants"],
      summary: "Update merchant",
      description: "Update a merchant for the authenticated user",
      responses: {
        200: selectMerchantSchema,
        400: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
    }),
    validate("param", idParamSchema),
    validate("json", createMerchantSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const user = c.get("user");
      const db = c.get("db");

      const existingMerchant = await db.query.merchant.findFirst({
        where: {
          id,
          user_id: user.id,
        },
      });

      if (!existingMerchant) {
        return jsonError(c, 404, "Merchant not found");
      }

      const normalizedName = body.name.trim();
      if (!normalizedName) {
        return jsonError(c, 400, "Merchant name is required");
      }

      const newLogoUrl = body.logo_url;
      if (newLogoUrl && newLogoUrl !== existingMerchant.logo_url) {
        let newDocId: number | null = null;
        const match = newLogoUrl.match(/\/api\/document\/(\d+)\/file/);
        if (match && match[1]) {
          newDocId = parseInt(match[1], 10);
        }

        const docs = await db
          .select()
          .from(document)
          .where(
            and(
              eq(document.user_id, user.id),
              eq(document.entity_type, "merchant" as DocumentEntityTypeEnum),
              eq(document.entity_id, id),
            ),
          );

        const docsToDelete = docs.filter((d) => d.id !== newDocId);

        if (docsToDelete.length > 0) {
          await Promise.allSettled(docsToDelete.map((doc) => env.USER_BUCKET.delete(doc.path)));
          await db.delete(document).where(
            inArray(
              document.id,
              docsToDelete.map((d) => d.id),
            ),
          );
        }
      }

      const [updatedMerchant] = await db
        .update(merchant)
        .set({
          name: normalizedName,
          logo_url: body.logo_url ?? existingMerchant.logo_url,
          website_url: body.website_url ?? existingMerchant.website_url,
          updated_at: new Date(),
        })
        .where(and(eq(merchant.id, id), eq(merchant.user_id, user.id)))
        .returning();

      if (!updatedMerchant) {
        return jsonError(c, 500, "Failed to update merchant");
      }

      return c.json(updatedMerchant, 200);
    },
  )
  .delete(
    "/:id",
    documented({
      tags: ["Merchants"],
      summary: "Delete merchant",
      description: "Delete a merchant for the authenticated user",
      responses: { 200: successSchema, 404: errorSchema },
    }),
    validate("param", idParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const user = c.get("user");
      const db = c.get("db");

      const existingMerchant = await db.query.merchant.findFirst({
        where: {
          id,
          user_id: user.id,
        },
      });

      if (!existingMerchant) {
        return jsonError(c, 404, "Merchant not found");
      }

      await cleanupEntityDocuments(db, user.id, "merchant", id);
      await db.delete(merchant).where(and(eq(merchant.id, id), eq(merchant.user_id, user.id)));

      return c.json({ success: true }, 200);
    },
  );
