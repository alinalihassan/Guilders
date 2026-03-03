import { and, eq, sql } from "drizzle-orm";
import * as z from "zod/v4";

import { account } from "../../db/schema/accounts";
import { transaction } from "../../db/schema/transactions";
import { createDb } from "../../lib/db";
import { makeTextPayload, type McpToolDefinition } from "./types";

type DeleteTransactionInput = {
  id: number;
};

export const deleteTransactionTool: McpToolDefinition<DeleteTransactionInput> = {
  name: "delete_transaction",
  description:
    "Delete a manual transaction and revert the associated account balance. Fails for synced (provider-managed) transactions; only manually created transactions can be deleted.",
  requiredScope: "write",
  inputSchema: {
    id: z.number().int(),
  },
  handler: async ({ id }, { userId }) => {
    try {
      const db = createDb();

      const existing = await db.query.transaction.findFirst({
        where: {
          id,
          account: { user_id: userId },
        },
      });

      if (!existing) {
        return {
          isError: true,
          content: [{ type: "text", text: "Transaction not found or does not belong to user." }],
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
              text: "Cannot delete this transaction; it is synced from a provider and managed by them. Only manual transactions can be deleted. To remove synced data, go to Settings → Connections and disconnect from that provider.",
            },
          ],
        };
      }

      await db.transaction(async (tx) => {
        const [updatedAccount] = await tx
          .update(account)
          .set({
            value: sql`${account.value} - ${existing.amount}`,
            updated_at: new Date(),
          })
          .where(and(eq(account.id, existing.account_id), eq(account.user_id, userId)))
          .returning({ id: account.id });
        if (!updatedAccount) throw new Error("Associated account not found.");

        await tx.delete(transaction).where(eq(transaction.id, id));
      });

      return makeTextPayload({ success: true, deletedTransactionId: id });
    } catch (error) {
      console.error("MCP delete_transaction failed:", error);
      return {
        isError: true,
        content: [{ type: "text", text: "Failed to delete transaction." }],
      };
    }
  },
};
