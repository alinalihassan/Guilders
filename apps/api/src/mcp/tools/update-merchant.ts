import { and, eq } from "drizzle-orm";
import * as z from "zod/v4";

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
    name: z.string().min(1).max(255).optional(),
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
