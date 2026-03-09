import { and, eq, sql } from "drizzle-orm";
import * as z from "zod/v4";

import { account } from "../../db/schema/accounts";
import { transaction } from "../../db/schema/transactions";
import { createDb } from "../../lib/db";
import { filterLockedUpdate } from "../../lib/locked-attributes";
import { makeTextPayload, type McpToolDefinition } from "./types";

type UpdateTransactionInput = {
  id: number;
  account_id?: number;
  amount?: number;
  currency?: string;
  timestamp?: string;
  description?: string;
  category_id?: number | null;
  merchant_id?: number | null;
};

export const updateTransactionTool: McpToolDefinition<UpdateTransactionInput> = {
  name: "update_transaction",
  description: "Update a transaction and adjust the associated account balance",
  requiredScope: "write",
  inputSchema: {
    id: z.number().int(),
    account_id: z.number().int().optional(),
    amount: z.number().optional(),
    currency: z.string().length(3).optional(),
    timestamp: z.iso.datetime().optional(),
    description: z.string().min(1).optional(),
    category_id: z.number().int().nullable().optional(),
    merchant_id: z.number().int().nullable().optional(),
  },
  handler: async ({ id, ...updates }, { userId }) => {
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

      const body: Record<string, unknown> = {};
      if (updates.account_id !== undefined) body.account_id = updates.account_id;
      if (updates.amount !== undefined) body.amount = updates.amount;
      if (updates.currency !== undefined) body.currency = updates.currency;
      if (updates.timestamp !== undefined) body.timestamp = updates.timestamp;
      if (updates.description !== undefined) body.description = updates.description;
      if (updates.category_id !== undefined) body.category_id = updates.category_id;
      if (updates.merchant_id !== undefined) body.merchant_id = updates.merchant_id;

      const { allowed, blocked } = filterLockedUpdate(body, existing.locked_attributes);
      if (blocked.length > 0) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Cannot update locked attributes: ${blocked.map(String).join(", ")}`,
            },
          ],
        };
      }

      const effectiveAccountId = (allowed.account_id as number) ?? existing.account_id;
      const effectiveAmount = allowed.amount !== undefined ? allowed.amount : existing.amount;
      const effectiveCurrency = (allowed.currency as string) ?? existing.currency;
      const rawTimestamp = (allowed.timestamp as string | undefined) ?? existing.timestamp;
      const effectiveTimestamp =
        typeof rawTimestamp === "string" ? new Date(rawTimestamp) : rawTimestamp;
      const effectiveDescription = (allowed.description as string) ?? existing.description;
      const effectiveCategoryId =
        "category_id" in allowed ? (allowed.category_id as number | null) : existing.category_id;
      const effectiveMerchantId =
        "merchant_id" in allowed ? (allowed.merchant_id as number | null) : existing.merchant_id;

      const targetAccount = await db.query.account.findFirst({
        where: { id: effectiveAccountId, user_id: userId },
      });

      if (!targetAccount) {
        return {
          isError: true,
          content: [{ type: "text", text: "Target account not found or does not belong to user." }],
        };
      }

      if (effectiveCurrency !== targetAccount.currency) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "Transaction currency must match the target account currency. Cannot move a transaction to an account with a different currency.",
            },
          ],
        };
      }

      if (effectiveCategoryId) {
        const cat = await db.query.category.findFirst({
          where: { id: effectiveCategoryId, user_id: userId },
        });
        if (!cat) {
          return {
            isError: true,
            content: [{ type: "text", text: "Category not found or does not belong to user." }],
          };
        }
      }

      if (effectiveMerchantId) {
        const merch = await db.query.merchant.findFirst({
          where: { id: effectiveMerchantId, user_id: userId },
        });
        if (!merch) {
          return {
            isError: true,
            content: [{ type: "text", text: "Merchant not found or does not belong to user." }],
          };
        }
      }

      const newAmount = String(effectiveAmount);

      const updated = await db.transaction(async (tx) => {
        const [locked] = await tx
          .select()
          .from(transaction)
          .where(eq(transaction.id, id))
          .for("update");

        if (!locked) {
          throw new Error("Transaction not found.");
        }

        const [ownerAccount] = await tx
          .select()
          .from(account)
          .where(and(eq(account.id, locked.account_id), eq(account.user_id, userId)));

        if (!ownerAccount) {
          throw new Error("Transaction does not belong to user.");
        }

        const oldAmount = locked.amount;
        const oldAccountId = locked.account_id;

        if (oldAccountId === effectiveAccountId) {
          await tx
            .update(account)
            .set({
              value: sql`${account.value} + (${newAmount}::numeric - ${oldAmount}::numeric)`,
              updated_at: new Date(),
            })
            .where(and(eq(account.id, effectiveAccountId), eq(account.user_id, userId)));
        } else {
          await tx
            .update(account)
            .set({
              value: sql`${account.value} - ${oldAmount}::numeric`,
              updated_at: new Date(),
            })
            .where(and(eq(account.id, oldAccountId), eq(account.user_id, userId)));

          await tx
            .update(account)
            .set({
              value: sql`${account.value} + ${newAmount}::numeric`,
              updated_at: new Date(),
            })
            .where(and(eq(account.id, effectiveAccountId), eq(account.user_id, userId)));
        }

        const [result] = await tx
          .update(transaction)
          .set({
            account_id: effectiveAccountId,
            amount: String(effectiveAmount),
            currency: effectiveCurrency,
            timestamp: effectiveTimestamp,
            description: effectiveDescription,
            category_id: effectiveCategoryId,
            merchant_id: effectiveMerchantId,
            updated_at: new Date(),
          })
          .where(eq(transaction.id, id))
          .returning();

        return result;
      });

      if (!updated) {
        return {
          isError: true,
          content: [{ type: "text", text: "Failed to update transaction." }],
        };
      }

      return makeTextPayload({ userId, transaction: updated });
    } catch (error) {
      console.error("MCP update_transaction failed:", error);
      return {
        isError: true,
        content: [{ type: "text", text: "Failed to update transaction." }],
      };
    }
  },
};
