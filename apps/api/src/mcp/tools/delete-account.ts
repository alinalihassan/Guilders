import { eq } from "drizzle-orm";
import * as z from "zod/v4";

import { account } from "../../db/schema/accounts";
import { cleanupAccountDocuments } from "../../lib/cleanup-documents";
import { createDb } from "../../lib/db";
import { makeTextPayload, type McpToolDefinition } from "./types";

type DeleteAccountInput = {
  id: number;
};

export const deleteAccountTool: McpToolDefinition<DeleteAccountInput> = {
  name: "delete_account",
  description:
    "Delete a manual account and all its children. Fails for synced (provider-managed) accounts; only accounts created manually can be deleted.",
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

      const locked = existing.locked_attributes as Record<string, unknown> | null | undefined;
      const isManual = !locked || Object.keys(locked).length === 0;
      if (!isManual) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "Cannot delete this account; it is synced with a provider and managed by them. Only manual accounts can be deleted. To remove a synced account, go to Settings → Connections and disconnect from that provider.",
            },
          ],
        };
      }

      await cleanupAccountDocuments(db, userId, id);
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
