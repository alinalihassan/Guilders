import * as z from "zod/v4";

import { merchant } from "../../db/schema/merchants";
import { createDb } from "../../lib/db";
import { makeTextPayload, type McpToolDefinition } from "./types";

type CreateMerchantInput = {
  name: string;
  logo_url?: string;
  website_url?: string;
};

export const createMerchantTool: McpToolDefinition<CreateMerchantInput> = {
  name: "create_merchant",
  description: "Create a new merchant (returns existing if name already exists)",
  requiredScope: "write",
  inputSchema: {
    name: z.string().min(1).max(255),
    logo_url: z.string().max(1024).optional(),
    website_url: z.string().max(1024).optional(),
  },
  handler: async ({ name, logo_url, website_url }, { userId }) => {
    try {
      const db = createDb();
      const normalizedName = name.trim();

      if (!normalizedName) {
        return {
          isError: true,
          content: [{ type: "text", text: "Merchant name is required." }],
        };
      }

      const [inserted] = await db
        .insert(merchant)
        .values({
          user_id: userId,
          name: normalizedName,
          logo_url: logo_url ?? null,
          website_url: website_url ?? null,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .onConflictDoNothing({ target: [merchant.user_id, merchant.name] })
        .returning();

      if (inserted) {
        return makeTextPayload({ userId, merchant: inserted });
      }

      const existing = await db.query.merchant.findFirst({
        where: { user_id: userId, name: normalizedName },
      });
      if (existing) {
        return makeTextPayload({ userId, merchant: existing, alreadyExisted: true });
      }

      return {
        isError: true,
        content: [{ type: "text", text: "Failed to create merchant." }],
      };
    } catch (error) {
      console.error("MCP create_merchant failed:", error);
      return {
        isError: true,
        content: [{ type: "text", text: "Failed to create merchant." }],
      };
    }
  },
};
