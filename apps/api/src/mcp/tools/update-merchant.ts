import { env } from "cloudflare:workers";
import { and, eq, inArray } from "drizzle-orm";
import * as z from "zod/v4";

import { document } from "../../db/schema/documents";
import type { DocumentEntityTypeEnum } from "../../db/schema/enums";
import { merchant } from "../../db/schema/merchants";
import { createDb } from "../../lib/db";
import { makeTextPayload, type McpToolDefinition } from "./types";

type UpdateMerchantInput = {
  id: number;
  name?: string;
  logo_url?: string | null;
  website_url?: string | null;
};

export const updateMerchantTool: McpToolDefinition<UpdateMerchantInput> = {
  name: "update_merchant",
  description: "Update an existing merchant",
  requiredScope: "write",
  inputSchema: {
    id: z.number().int(),
    name: z.optional(
      z
        .string()
        .transform((s) => s.trim())
        .pipe(z.string().min(1).max(255)),
    ),
    logo_url: z.string().max(1024).nullable().optional(),
    website_url: z.string().max(1024).nullable().optional(),
  },
  handler: async ({ id, ...updates }, { userId }) => {
    try {
      const db = createDb();

      const existing = await db.query.merchant.findFirst({
        where: {
          id,
          user_id: userId,
        },
      });

      if (!existing) {
        return {
          isError: true,
          content: [{ type: "text", text: "Merchant not found or does not belong to user." }],
        };
      }

      if (updates.logo_url && updates.logo_url !== existing.logo_url) {
        let newDocId: number | null = null;
        const match = updates.logo_url.match(/\/api\/document\/(\d+)\/file/);
        if (match && match[1]) {
          newDocId = parseInt(match[1], 10);
        }

        const docs = await db
          .select()
          .from(document)
          .where(
            and(
              eq(document.user_id, userId),
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

      const [updated] = await db
        .update(merchant)
        .set({
          ...updates,
          updated_at: new Date(),
        })
        .where(and(eq(merchant.id, id), eq(merchant.user_id, userId)))
        .returning();

      if (!updated) {
        return {
          isError: true,
          content: [{ type: "text", text: "Failed to update merchant." }],
        };
      }

      return makeTextPayload({ userId, merchant: updated });
    } catch (error) {
      console.error("MCP update_merchant failed:", error);
      return {
        isError: true,
        content: [{ type: "text", text: "Failed to update merchant." }],
      };
    }
  },
};
