import { eq } from "drizzle-orm";
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
  date?: string;
  description?: string;
  category_id?: number | null;
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
    date: z.string().date().optional(),
    description: z.string().min(1).optional(),
    category_id: z.number().int().nullable().optional(),
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
      if (updates.date !== undefined) body.date = updates.date;
      if (updates.description !== undefined) body.description = updates.description;
      if (updates.category_id !== undefined) body.category_id = updates.category_id;

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
      const effectiveDate = (allowed.date as string) ?? existing.date;
      const effectiveDescription = (allowed.description as string) ?? existing.description;
      const effectiveCategoryId =
        "category_id" in allowed ? (allowed.category_id as number | null) : existing.category_id;

      const targetAccount = await db.query.account.findFirst({
        where: { id: effectiveAccountId, user_id: userId },
      });

      if (!targetAccount) {
        return {
          isError: true,
          content: [{ type: "text", text: "Target account not found or does not belong to user." }],
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

      const oldAmount = parseFloat(existing.amount.toString());
      const newAmount = parseFloat(String(effectiveAmount));
      const amountDiff = newAmount - oldAmount;
      const currentAccountValue = parseFloat(targetAccount.value.toString());
      const newAccountValue = currentAccountValue + amountDiff;

      const updated = await db.transaction(async (tx) => {
        await tx
          .update(account)
          .set({ value: newAccountValue.toString(), updated_at: new Date() })
          .where(eq(account.id, effectiveAccountId));

        const [result] = await tx
          .update(transaction)
          .set({
            account_id: effectiveAccountId,
            amount: String(effectiveAmount),
            currency: effectiveCurrency,
            date: effectiveDate,
            description: effectiveDescription,
            category_id: effectiveCategoryId,
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
