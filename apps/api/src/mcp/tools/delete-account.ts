import { eq } from "drizzle-orm";
import * as z from "zod/v4";

import { account } from "../../db/schema/accounts";
import { createDb } from "../../lib/db";
import { makeTextPayload, type McpToolDefinition } from "./types";

type DeleteAccountInput = {
  id: number;
};

export const deleteAccountTool: McpToolDefinition<DeleteAccountInput> = {
  name: "delete_account",
  description: "Delete an account and all its children",
  requiredScope: "write",
  inputSchema: {
    id: z.number().int(),
  },
  handler: async ({ id }, { userId }) => {
    try {
      const db = createDb();

      const existing = await db.query.account.findFirst({
        where: { id, user_id: userId },
      });

      if (!existing) {
        return {
          isError: true,
          content: [{ type: "text", text: "Account not found or does not belong to user." }],
        };
      }

      await db.delete(account).where(eq(account.id, id));

      return makeTextPayload({ success: true, deletedAccountId: id });
    } catch (error) {
      console.error("MCP delete_account failed:", error);
      return {
        isError: true,
        content: [{ type: "text", text: "Failed to delete account." }],
      };
    }
  },
};
