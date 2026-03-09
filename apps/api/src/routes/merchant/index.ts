import { and, asc, eq } from "drizzle-orm";
import { Elysia, status, t } from "elysia";

import { insertMerchantSchema, merchant, selectMerchantSchema } from "../../db/schema/merchants";
import { cleanupEntityDocuments } from "../../lib/cleanup-documents";
import { authPlugin } from "../../middleware/auth";
import { errorSchema } from "../../utils/error";
import { createMerchantSchema, merchantIdParamSchema } from "./types";

export const merchantRoutes = new Elysia({
  prefix: "/merchant",
  detail: {
    tags: ["Merchants"],
    security: [{ apiKeyAuth: [] }, { bearerAuth: [] }],
  },
})
  .use(authPlugin)
  .model({
    Merchant: selectMerchantSchema,
    CreateMerchant: insertMerchantSchema,
  })
  .get(
    "",
    async ({ user, db }) => {
      const merchants = await db.query.merchant.findMany({
        where: { user_id: user.id },
        orderBy: (m) => asc(m.name),
      });
      return merchants;
    },
    {
      auth: true,
      response: t.Array(t.Ref("#/components/schemas/Merchant")),
      detail: {
        summary: "Get merchants",
        description: "Retrieve all merchants for the authenticated user.",
      },
    },
  )
  .post(
    "",
    async ({ body, user, db }) => {
      const normalizedName = body.name.trim();
      if (!normalizedName) {
        return status(400, { error: "Merchant name is required" });
      }

      const existingMerchant = await db.query.merchant.findFirst({
        where: {
          user_id: user.id,
          name: normalizedName,
        },
      });

      if (existingMerchant) {
        return existingMerchant;
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
        return status(500, { error: "Failed to create merchant" });
      }

      return newMerchant;
    },
    {
      auth: true,
      body: createMerchantSchema,
      response: {
        200: "Merchant",
        400: errorSchema,
        500: errorSchema,
      },
      detail: {
        summary: "Create merchant",
        description: "Create a new merchant for the authenticated user",
      },
    },
  )
  .put(
    "/:id",
    async ({ params, body, user, db }) => {
      const existingMerchant = await db.query.merchant.findFirst({
        where: {
          id: params.id,
          user_id: user.id,
        },
      });

      if (!existingMerchant) {
        return status(404, { error: "Merchant not found" });
      }

      const normalizedName = body.name.trim();
      if (!normalizedName) {
        return status(400, { error: "Merchant name is required" });
      }

      const [updatedMerchant] = await db
        .update(merchant)
        .set({
          name: normalizedName,
          logo_url: body.logo_url ?? existingMerchant.logo_url,
          website_url: body.website_url ?? existingMerchant.website_url,
          updated_at: new Date(),
        })
        .where(and(eq(merchant.id, params.id), eq(merchant.user_id, user.id)))
        .returning();

      if (!updatedMerchant) {
        return status(500, { error: "Failed to update merchant" });
      }

      return updatedMerchant;
    },
    {
      auth: true,
      params: merchantIdParamSchema,
      body: createMerchantSchema,
      response: {
        200: "Merchant",
        400: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
      detail: {
        summary: "Update merchant",
        description: "Update a merchant for the authenticated user",
      },
    },
  )
  .delete(
    "/:id",
    async ({ params, user, db }) => {
      const existingMerchant = await db.query.merchant.findFirst({
        where: {
          id: params.id,
          user_id: user.id,
        },
      });

      if (!existingMerchant) {
        return status(404, { error: "Merchant not found" });
      }

      await cleanupEntityDocuments(db, user.id, "merchant", params.id);
      await db
        .delete(merchant)
        .where(and(eq(merchant.id, params.id), eq(merchant.user_id, user.id)));

      return { success: true };
    },
    {
      auth: true,
      params: merchantIdParamSchema,
      response: {
        200: t.Object({ success: t.Boolean() }),
        404: errorSchema,
      },
      detail: {
        summary: "Delete merchant",
        description: "Delete a merchant for the authenticated user",
      },
    },
  );
