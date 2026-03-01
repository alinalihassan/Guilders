import { eq } from "drizzle-orm";
import { Elysia, status, t } from "elysia";

import { account } from "../../db/schema/accounts";
import {
  insertTransactionSchema,
  selectTransactionSchema,
  transaction,
} from "../../db/schema/transactions";
import { filterLockedUpdate } from "../../lib/locked-attributes";
import { authPlugin } from "../../middleware/auth";
import { errorSchema } from "../../utils/error";
import { transactionIdParamSchema, transactionQuerySchema } from "./types";

export const transactionRoutes = new Elysia({
  prefix: "/transaction",
  detail: {
    tags: ["Transactions"],
    security: [{ apiKeyAuth: [] }, { bearerAuth: [] }],
  },
})
  .use(authPlugin)
  .model({
    Transaction: selectTransactionSchema,
    CreateTransaction: insertTransactionSchema,
  })
  .get(
    "",
    async ({ user, query, db }) => {
      return await db.query.transaction.findMany({
        where: {
          account_id: query.accountId,
          account: {
            user_id: user.id,
          },
        },
        orderBy: (transactions, { desc }) => desc(transactions.date),
      });
    },
    {
      auth: true,
      query: transactionQuerySchema,
      response: t.Array(t.Ref("#/components/schemas/Transaction")),
      detail: {
        summary: "Get all transactions",
        description:
          "Retrieve all transactions for the authenticated user, optionally filtered by account",
      },
    },
  )
  .post(
    "",
    async ({ body, user, db }) => {
      // Verify the account belongs to the user
      const accountResult = await db.query.account.findFirst({
        where: {
          id: body.account_id,
          user_id: user.id,
        },
      });

      if (!accountResult) {
        return status(404, { error: "Account not found" });
      }

      const amount = parseFloat(body.amount.toString());

      if (body.category_id) {
        const categoryResult = await db.query.category.findFirst({
          where: {
            id: body.category_id,
            user_id: user.id,
          },
        });

        if (!categoryResult) {
          return status(404, { error: "Category not found" });
        }
      }

      // Update account value
      const currentValue = parseFloat(accountResult.value.toString());
      const newValue = currentValue + amount;

      const newTransaction = await db.transaction(async (tx) => {
        await tx
          .update(account)
          .set({ value: newValue.toString(), updated_at: new Date() })
          .where(eq(account.id, body.account_id));

        // Create transaction
        const [transactionResult] = await tx
          .insert(transaction)
          .values({
            account_id: body.account_id,
            amount: body.amount,
            currency: body.currency,
            date: body.date,
            description: body.description,
            category_id: body.category_id,
            provider_transaction_id: body.provider_transaction_id || null,
            documents: body.documents || null,
          })
          .returning();

        return transactionResult;
      });

      if (!newTransaction) {
        return status(500, { error: "Failed to create transaction" });
      }

      return newTransaction;
    },
    {
      auth: true,
      body: insertTransactionSchema,
      response: {
        200: "Transaction",
        404: errorSchema,
        500: errorSchema,
      },
      detail: {
        summary: "Create transaction",
        description: "Create a new transaction and update the associated account balance",
      },
    },
  )
  .get(
    "/:id",
    async ({ params, user, db }) => {
      const transactionResult = await db.query.transaction.findFirst({
        where: {
          id: params.id,
          account: {
            user_id: user.id,
          },
        },
      });

      if (!transactionResult) {
        return status(404, { error: "Transaction not found" });
      }

      return transactionResult;
    },
    {
      auth: true,
      params: transactionIdParamSchema,
      response: {
        200: "Transaction",
        404: errorSchema,
      },
      detail: {
        summary: "Get transaction by ID",
        description: "Retrieve a specific transaction by its ID",
      },
    },
  )
  .put(
    "/:id",
    async ({ params, body, user, db }) => {
      // Get existing transaction first so lock filtering can run against it.
      const existingTransaction = await db.query.transaction.findFirst({
        where: {
          id: params.id,
          account: {
            user_id: user.id,
          },
        },
      });

      if (!existingTransaction) {
        return status(404, { error: "Transaction not found" });
      }

      const { allowed, blocked } = filterLockedUpdate(
        body as Record<string, unknown>,
        existingTransaction.locked_attributes,
      );

      if (blocked.length > 0) {
        console.warn("[Transaction] blocked locked attribute update", {
          transactionId: params.id,
          userId: user.id,
          blockedFields: blocked,
        });
        return status(409, {
          error: `Cannot update locked attributes: ${blocked.map(String).join(", ")}`,
        });
      }
      const unlockedBody = allowed as typeof body;

      const effectiveAccountId = unlockedBody.account_id ?? existingTransaction.account_id;
      const effectiveCategoryId =
        "category_id" in unlockedBody ? unlockedBody.category_id : existingTransaction.category_id;
      const effectiveAmount = unlockedBody.amount ?? existingTransaction.amount;
      const effectiveCurrency = unlockedBody.currency ?? existingTransaction.currency;
      const effectiveDate = unlockedBody.date ?? existingTransaction.date;
      const effectiveDescription = unlockedBody.description ?? existingTransaction.description;
      const effectiveDocuments = unlockedBody.documents ?? existingTransaction.documents;
      const effectiveProviderTransactionId =
        unlockedBody.provider_transaction_id ?? existingTransaction.provider_transaction_id;

      // Verify the target account belongs to the user.
      const targetAccount = await db.query.account.findFirst({
        where: {
          id: effectiveAccountId,
          user_id: user.id,
        },
      });

      if (!targetAccount) {
        return status(404, { error: "Account not found" });
      }

      if (effectiveCategoryId) {
        const categoryResult = await db.query.category.findFirst({
          where: {
            id: effectiveCategoryId,
            user_id: user.id,
          },
        });

        if (!categoryResult) {
          return status(404, { error: "Category not found" });
        }
      }

      // Calculate value adjustment
      const oldTransactionAmount = parseFloat(existingTransaction.amount.toString());
      const newTransactionAmount = parseFloat(effectiveAmount.toString());
      const amountDiff = newTransactionAmount - oldTransactionAmount;
      const currentAccountValue = parseFloat(targetAccount.value.toString());
      const newAccountValue = currentAccountValue + amountDiff;

      const updatedTransaction = await db.transaction(async (tx) => {
        // Update account value
        await tx
          .update(account)
          .set({ value: newAccountValue.toString(), updated_at: new Date() })
          .where(eq(account.id, effectiveAccountId));

        // Update transaction
        const [updatedTransactionResult] = await tx
          .update(transaction)
          .set({
            account_id: effectiveAccountId,
            amount: effectiveAmount,
            currency: effectiveCurrency,
            date: effectiveDate,
            description: effectiveDescription,
            category_id: effectiveCategoryId,
            provider_transaction_id: effectiveProviderTransactionId,
            documents: effectiveDocuments,
            updated_at: new Date(),
          })
          .where(eq(transaction.id, params.id))
          .returning();

        return updatedTransactionResult;
      });

      if (!updatedTransaction) {
        return status(500, { error: "Failed to update transaction" });
      }

      return updatedTransaction;
    },
    {
      auth: true,
      params: transactionIdParamSchema,
      body: insertTransactionSchema,
      response: {
        200: "Transaction",
        409: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
      detail: {
        summary: "Update transaction",
        description: "Update a transaction and adjust the associated account balance",
      },
    },
  )
  .delete(
    "/:id",
    async ({ params, user, db }) => {
      const existingTransaction = await db.query.transaction.findFirst({
        where: {
          id: params.id,
          account: {
            user_id: user.id,
          },
        },
      });

      if (!existingTransaction) {
        return status(404, { error: "Transaction not found" });
      }

      // Get account for balance update
      const accountResult = await db.query.account.findFirst({
        where: {
          id: existingTransaction.account_id,
        },
      });

      if (!accountResult) {
        return status(404, { error: "Associated account not found" });
      }

      const targetAccount = accountResult;
      const amount = parseFloat(existingTransaction.amount.toString());

      const currentValue = parseFloat(targetAccount.value.toString());
      const newValue = currentValue - amount;

      await db.transaction(async (tx) => {
        // Update account value
        await tx
          .update(account)
          .set({ value: newValue.toString(), updated_at: new Date() })
          .where(eq(account.id, existingTransaction.account_id));

        // Delete transaction
        await tx.delete(transaction).where(eq(transaction.id, params.id));
      });

      return { success: true };
    },
    {
      auth: true,
      params: transactionIdParamSchema,
      response: {
        200: t.Object({ success: t.Boolean() }),
        404: errorSchema,
        500: errorSchema,
      },
      detail: {
        summary: "Delete transaction",
        description: "Delete a transaction and revert the associated account balance",
      },
    },
  );
