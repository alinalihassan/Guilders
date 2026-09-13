import { waitUntil } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { account } from "../../db/schema/accounts";
import { selectTransactionSchema, transaction } from "../../db/schema/transactions";
import { cleanupEntityDocuments } from "../../lib/cleanup-documents";
import { documented, idParamSchema, jsonError, successSchema, validate } from "../../lib/http";
import { filterLockedUpdate } from "../../lib/locked-attributes";
import { deliverUserWebhookEvents } from "../../lib/user-webhooks";
import { requireAuth, type AuthEnv } from "../../middleware/auth";
import { errorSchema } from "../../utils/error";
import { createTransactionSchema, transactionQuerySchema } from "./types";

export const transactionRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .get(
    "/",
    documented({
      tags: ["Transactions"],
      summary: "Get all transactions",
      description:
        "Retrieve all transactions for the authenticated user, optionally filtered by account",
      responses: { 200: z.array(selectTransactionSchema) },
    }),
    validate("query", transactionQuerySchema),
    async (c) => {
      const query = c.req.valid("query");
      const user = c.get("user");
      const db = c.get("db");

      const rows = await db.query.transaction.findMany({
        where: {
          ...(query.accountId !== undefined ? { account_id: query.accountId } : {}),
          account: {
            user_id: user.id,
          },
        },
        orderBy: (transactions, { desc }) => desc(transactions.timestamp),
      });

      return c.json(rows, 200);
    },
  )
  .post(
    "/",
    documented({
      tags: ["Transactions"],
      summary: "Create transaction",
      description: "Create a new transaction and update the associated account balance",
      responses: {
        200: selectTransactionSchema,
        400: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
    }),
    validate("json", createTransactionSchema),
    async (c) => {
      const body = c.req.valid("json");
      const user = c.get("user");
      const db = c.get("db");

      const accountResult = await db.query.account.findFirst({
        where: {
          id: body.account_id,
          user_id: user.id,
        },
      });

      if (!accountResult) {
        return jsonError(c, 404, "Account not found");
      }

      if (body.currency !== accountResult.currency) {
        return jsonError(
          c,
          400,
          `Transaction currency (${body.currency}) must match account currency (${accountResult.currency})`,
        );
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
          return jsonError(c, 404, "Category not found");
        }
      }

      if (body.merchant_id) {
        const merchantResult = await db.query.merchant.findFirst({
          where: {
            id: body.merchant_id,
            user_id: user.id,
          },
        });

        if (!merchantResult) {
          return jsonError(c, 404, "Merchant not found");
        }
      }

      const currentValue = parseFloat(accountResult.value.toString());
      const newValue = currentValue + amount;

      const newTransaction = await db.transaction(async (tx) => {
        await tx
          .update(account)
          .set({ value: newValue.toString(), updated_at: new Date() })
          .where(eq(account.id, body.account_id));

        const [transactionResult] = await tx
          .insert(transaction)
          .values({
            account_id: body.account_id,
            amount: body.amount,
            currency: body.currency,
            timestamp: new Date(body.timestamp),
            description: body.description,
            category_id: body.category_id,
            merchant_id: body.merchant_id,
            provider_transaction_id: body.provider_transaction_id || null,
            documents: body.documents || null,
          })
          .returning();

        return transactionResult;
      });

      if (!newTransaction) {
        return jsonError(c, 500, "Failed to create transaction");
      }

      waitUntil(
        deliverUserWebhookEvents(db, user.id, "transaction.created", {
          transaction: newTransaction,
        }),
      );

      return c.json(newTransaction, 200);
    },
  )
  .get(
    "/:id",
    documented({
      tags: ["Transactions"],
      summary: "Get transaction by ID",
      description: "Retrieve a specific transaction by its ID",
      responses: { 200: selectTransactionSchema, 404: errorSchema },
    }),
    validate("param", idParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const user = c.get("user");
      const db = c.get("db");

      const transactionResult = await db.query.transaction.findFirst({
        where: {
          id,
          account: {
            user_id: user.id,
          },
        },
      });

      if (!transactionResult) {
        return jsonError(c, 404, "Transaction not found");
      }

      return c.json(transactionResult, 200);
    },
  )
  .put(
    "/:id",
    documented({
      tags: ["Transactions"],
      summary: "Update transaction",
      description: "Update a transaction and adjust the associated account balance",
      responses: {
        200: selectTransactionSchema,
        400: errorSchema,
        409: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
    }),
    validate("param", idParamSchema),
    validate("json", createTransactionSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const user = c.get("user");
      const db = c.get("db");

      const existingTransaction = await db.query.transaction.findFirst({
        where: {
          id,
          account: {
            user_id: user.id,
          },
        },
      });

      if (!existingTransaction) {
        return jsonError(c, 404, "Transaction not found");
      }

      const { allowed, blocked } = filterLockedUpdate(
        body as Record<string, unknown>,
        existingTransaction.locked_attributes,
      );

      if (blocked.length > 0) {
        console.warn("[Transaction] blocked locked attribute update", {
          transactionId: id,
          userId: user.id,
          blockedFields: blocked,
        });
        return jsonError(
          c,
          409,
          `Cannot update locked attributes: ${blocked.map(String).join(", ")}`,
        );
      }
      const unlockedBody = allowed as typeof body;

      const effectiveAccountId = unlockedBody.account_id ?? existingTransaction.account_id;
      const effectiveCategoryId =
        "category_id" in unlockedBody ? unlockedBody.category_id : existingTransaction.category_id;
      const effectiveMerchantId =
        "merchant_id" in unlockedBody ? unlockedBody.merchant_id : existingTransaction.merchant_id;
      const effectiveAmount = unlockedBody.amount ?? existingTransaction.amount;
      const effectiveCurrency = unlockedBody.currency ?? existingTransaction.currency;
      const rawTimestamp = unlockedBody.timestamp ?? existingTransaction.timestamp;
      const effectiveTimestamp =
        typeof rawTimestamp === "string" ? new Date(rawTimestamp) : rawTimestamp;
      const effectiveDescription = unlockedBody.description ?? existingTransaction.description;
      const effectiveDocuments = unlockedBody.documents ?? existingTransaction.documents;
      const effectiveProviderTransactionId =
        unlockedBody.provider_transaction_id ?? existingTransaction.provider_transaction_id;

      const targetAccount = await db.query.account.findFirst({
        where: {
          id: effectiveAccountId,
          user_id: user.id,
        },
      });

      if (!targetAccount) {
        return jsonError(c, 404, "Account not found");
      }

      if (effectiveCurrency !== targetAccount.currency) {
        return jsonError(
          c,
          400,
          `Transaction currency (${effectiveCurrency}) must match account currency (${targetAccount.currency})`,
        );
      }

      if (effectiveCategoryId) {
        const categoryResult = await db.query.category.findFirst({
          where: {
            id: effectiveCategoryId,
            user_id: user.id,
          },
        });

        if (!categoryResult) {
          return jsonError(c, 404, "Category not found");
        }
      }

      if (effectiveMerchantId) {
        const merchantResult = await db.query.merchant.findFirst({
          where: {
            id: effectiveMerchantId,
            user_id: user.id,
          },
        });

        if (!merchantResult) {
          return jsonError(c, 404, "Merchant not found");
        }
      }

      const oldTransactionAmount = parseFloat(existingTransaction.amount.toString());
      const newTransactionAmount = parseFloat(effectiveAmount.toString());
      const amountDiff = newTransactionAmount - oldTransactionAmount;
      const currentAccountValue = parseFloat(targetAccount.value.toString());
      const newAccountValue = currentAccountValue + amountDiff;

      const updatedTransaction = await db.transaction(async (tx) => {
        await tx
          .update(account)
          .set({ value: newAccountValue.toString(), updated_at: new Date() })
          .where(eq(account.id, effectiveAccountId));

        const [updatedTransactionResult] = await tx
          .update(transaction)
          .set({
            account_id: effectiveAccountId,
            amount: effectiveAmount,
            currency: effectiveCurrency,
            timestamp: effectiveTimestamp,
            description: effectiveDescription,
            category_id: effectiveCategoryId,
            merchant_id: effectiveMerchantId,
            provider_transaction_id: effectiveProviderTransactionId,
            documents: effectiveDocuments,
            updated_at: new Date(),
          })
          .where(eq(transaction.id, id))
          .returning();

        return updatedTransactionResult;
      });

      if (!updatedTransaction) {
        return jsonError(c, 500, "Failed to update transaction");
      }

      waitUntil(
        deliverUserWebhookEvents(db, user.id, "transaction.updated", {
          transaction: updatedTransaction,
        }),
      );

      return c.json(updatedTransaction, 200);
    },
  )
  .delete(
    "/:id",
    documented({
      tags: ["Transactions"],
      summary: "Delete transaction",
      description: "Delete a transaction and revert the associated account balance",
      responses: { 200: successSchema, 404: errorSchema, 500: errorSchema },
    }),
    validate("param", idParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const user = c.get("user");
      const db = c.get("db");

      const existingTransaction = await db.query.transaction.findFirst({
        where: {
          id,
          account: {
            user_id: user.id,
          },
        },
      });

      if (!existingTransaction) {
        return jsonError(c, 404, "Transaction not found");
      }

      const accountResult = await db.query.account.findFirst({
        where: {
          id: existingTransaction.account_id,
        },
      });

      if (!accountResult) {
        return jsonError(c, 404, "Associated account not found");
      }

      const amount = parseFloat(existingTransaction.amount.toString());
      const currentValue = parseFloat(accountResult.value.toString());
      const newValue = currentValue - amount;

      await cleanupEntityDocuments(db, user.id, "transaction", id);

      await db.transaction(async (tx) => {
        await tx
          .update(account)
          .set({ value: newValue.toString(), updated_at: new Date() })
          .where(eq(account.id, existingTransaction.account_id));

        await tx.delete(transaction).where(eq(transaction.id, id));
      });

      waitUntil(
        deliverUserWebhookEvents(db, user.id, "transaction.deleted", {
          transaction: existingTransaction,
        }),
      );

      return c.json({ success: true }, 200);
    },
  );
