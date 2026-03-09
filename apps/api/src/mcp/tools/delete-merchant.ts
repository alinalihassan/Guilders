import { and, eq } from "drizzle-orm";
import * as z from "zod/v4";

import { merchant } from "../../db/schema/merchants";
import { createDb } from "../../lib/db";
import { makeTextPayload, type McpToolDefinition } from "./types";

type DeleteMerchantInput = {
  id: number;
};

export const deleteMerchantTool: McpToolDefinition<DeleteMerchantInput> = {
  name: "delete_merchant",
  description:
    "Delete a merchant. Transactions using this merchant will have their merchant_id set to null.",
  requiredScope: "write",
  inputSchema: {
    id: z.number().int(),
  },
  handler: async ({ id }, { userId }) => {
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

      await db.delete(merchant).where(and(eq(merchant.id, id), eq(merchant.user_id, userId)));

      return makeTextPayload({
        userId,
        success: true,
        message: `Merchant ${id} deleted successfully.`,
      });
    } catch (error) {
      console.error("MCP delete_merchant failed:", error);
      return {
        isError: true,
        content: [{ type: "text", text: "Failed to delete merchant." }],
      };
    }
  },
};
