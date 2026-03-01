import { eq } from "drizzle-orm";
import * as z from "zod/v4";

import { account } from "../../db/schema/accounts";
import { transaction } from "../../db/schema/transactions";
import { createDb } from "../../lib/db";
import { makeTextPayload, type McpToolDefinition } from "./types";

type CreateTransactionInput = {
  account_id: number;
  amount: number;
  currency: string;
  date: string;
  description: string;
  category_id?: number;
};

export const createTransactionTool: McpToolDefinition<CreateTransactionInput> = {
  name: "create_transaction",
  description: "Create a new transaction and update the associated account balance",
  requiredScope: "write",
  inputSchema: {
    account_id: z.number().int(),
    amount: z.number(),
    currency: z.string().length(3),
    date: z.string().date(),
    description: z.string().min(1),
    category_id: z.number().int().optional(),
  },
  handler: async ({ account_id, amount, currency, date, description, category_id }, { userId }) => {
    try {
      const db = createDb();

      const accountResult = await db.query.account.findFirst({
        where: {
          id: account_id,
          user_id: userId,
        },
      });

      if (!accountResult) {
        return {
          isError: true,
          content: [{ type: "text", text: "Account not found or does not belong to user." }],
        };
      }

      if (category_id) {
        const categoryResult = await db.query.category.findFirst({
          where: {
            id: category_id,
            user_id: userId,
          },
        });

        if (!categoryResult) {
          return {
            isError: true,
            content: [{ type: "text", text: "Category not found or does not belong to user." }],
          };
        }
      }

      const currentValue = parseFloat(accountResult.value.toString());
      const newValue = currentValue + amount;

      const newTransaction = await db.transaction(async (tx) => {
        await tx
          .update(account)
          .set({ value: newValue.toString(), updated_at: new Date() })
          .where(eq(account.id, account_id));

        const [transactionResult] = await tx
          .insert(transaction)
          .values({
            account_id,
            amount: amount.toString(),
            currency,
            date,
            description,
            category_id: category_id ?? null,
          })
          .returning();

        return transactionResult;
      });

      if (!newTransaction) {
        return {
          isError: true,
          content: [{ type: "text", text: "Failed to create transaction." }],
        };
      }

      return makeTextPayload({
        userId,
        transaction: newTransaction,
      });
    } catch (error) {
      console.error("MCP create_transaction failed:", error);
      return {
        isError: true,
        content: [{ type: "text", text: "Failed to create transaction." }],
      };
    }
  },
};
