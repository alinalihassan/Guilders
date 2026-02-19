import { eq } from "drizzle-orm";
import { Elysia, status, t } from "elysia";
import { asset } from "../../db/schema/assets";
import {
  insertTransactionSchema,
  selectTransactionSchema,
  transaction,
} from "../../db/schema/transactions";
import { db } from "../../lib/db";
import { authPlugin } from "../../middleware/auth";
import { errorSchema } from "../../utils/error";

export const transactionRoutes = new Elysia({
  prefix: "/transaction",
  detail: {
    tags: ["Transactions"],
    security: [{ bearerAuth: [] }],
  }
})
  .use(authPlugin)
  .model({
    Transaction: selectTransactionSchema,
    CreateTransaction: insertTransactionSchema,
  })
  .get(
    "",
    async ({ user, query }) => {
      return await db.query.transaction.findMany({
        where: {
          asset_id: query.assetId,
          asset: {
            user_id: user.id,
          }
        },
        orderBy: (transactions, { desc }) => desc(transactions.date),
      });
    },
    {
      auth: true,
      query: t.Object({
        assetId: t.Optional(t.Number()),
      }),
      response: t.Array(t.Ref("#/components/schemas/Transaction")),
      detail: {
        summary: "Get all transactions",
        description:
          "Retrieve all transactions for the authenticated user, optionally filtered by asset",
      },
    },
  )
  .post(
    "",
    async ({ body, user }) => {
      // Verify the asset belongs to the user
      const assetResult = await db
        .query.asset.findFirst({
          where: {
            id: body.asset_id,
            user_id: user.id,
          },
        });

      if (!assetResult) {
        return status(404, { error: "Asset not found" });
      }

      const amount = parseFloat(body.amount.toString());

      // Update asset value
      const currentValue = parseFloat(assetResult.value.toString());
      const newValue = currentValue + amount;

      const newTransaction = await db.transaction(async (tx) => {
        await tx
          .update(asset)
          .set({ value: newValue.toString(), updated_at: new Date() })
          .where(eq(asset.id, body.asset_id));

        // Create transaction
        const [transactionResult] = await tx
          .insert(transaction)
          .values({
            asset_id: body.asset_id,
            amount: body.amount,
            currency: body.currency,
            date: body.date,
            description: body.description,
            category: body.category || "uncategorized",
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
        200: 'Transaction',
        404: errorSchema,
        500: errorSchema,
      },
      detail: {
        summary: "Create transaction",
        description:
          "Create a new transaction and update the associated account balance",
      },
    },
  )
  .get(
    "/:id",
    async ({ params, user }) => {
      const transactionResult = await db.query.transaction.findFirst({
        where: {
          id: params.id,
          asset: {
            user_id: user.id,
          }
        },
      });

      if (!transactionResult) {
        return status(404, { error: "Transaction not found" });
      }

      return transactionResult;
    },
    {
      auth: true,
      params: t.Object({
        id: t.Number(),
      }),
      response: {
        200: 'Transaction',
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
    async ({ params, body, user }) => {
      // Verify the asset belongs to the user
      const targetAsset = await db
        .query.asset.findFirst({
          where: {
            id: body.asset_id,
            user_id: user.id,
          },
        });

      if (!targetAsset) {
        return status(404, { error: "Asset not found" });
      }

      // Get existing transaction
      const existingTransaction = await db
        .query.transaction.findFirst({
          where: {
            id: params.id,
            asset: {
              user_id: user.id,
            }
          },
        });

      if (!existingTransaction) {
        return status(404, { error: "Transaction not found" });
      }

      // Calculate value adjustment
      const oldTransactionAmount = parseFloat(existingTransaction.amount.toString());
      const newTransactionAmount = parseFloat(body.amount.toString());
      const amountDiff = newTransactionAmount - oldTransactionAmount;
      const currentAssetValue = parseFloat(targetAsset.value.toString());
      const newAssetValue = currentAssetValue + amountDiff;

      const updatedTransaction = await db.transaction(async (tx) => {
        // Update asset value
        await tx
          .update(asset)
          .set({ value: newAssetValue.toString(), updated_at: new Date() })
          .where(eq(asset.id, body.asset_id));

        // Update transaction
        const [updatedTransactionResult] = await tx
          .update(transaction)
          .set({
            asset_id: body.asset_id,
            amount: body.amount,
            currency: body.currency,
            date: body.date,
            description: body.description,
            category: body.category || existingTransaction.category,
            provider_transaction_id:
              body.provider_transaction_id ||
              existingTransaction.provider_transaction_id,
            documents: body.documents || existingTransaction.documents,
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
      params: t.Object({
        id: t.Number(),
      }),
      body: insertTransactionSchema,
      response: {
        200: 'Transaction',
        404: errorSchema,
        500: errorSchema,
      },
      detail: {
        summary: "Update transaction",
        description:
          "Update a transaction and adjust the associated account balance",
      },
    },
  )
  .delete(
    "/:id",
    async ({ params, user }) => {
      const existingTransaction = await db.query.transaction.findFirst({
        where: {
          id: params.id,
          asset: {
            user_id: user.id,
          }
        },
      });

      if (!existingTransaction) {
        return status(404, { error: "Transaction not found" });
      }

      // Get asset for balance update
      const assetResult = await db
        .query.asset.findFirst({
          where: {
            id: existingTransaction.asset_id,
          },
        });

      if (!assetResult) {
        return status(404, { error: "Associated asset not found" });
      }

      const targetAsset = assetResult;
      const amount = parseFloat(existingTransaction.amount.toString());

      const currentValue = parseFloat(targetAsset.value.toString());
      const newValue = currentValue - amount;

      await db.transaction(async (tx) => {
        // Update asset value
        await tx
          .update(asset)
          .set({ value: newValue.toString(), updated_at: new Date() })
          .where(eq(asset.id, existingTransaction.asset_id));

        // Delete transaction
        await tx.delete(transaction).where(eq(transaction.id, params.id));
      });

      return { success: true };
    },
    {
      auth: true,
      params: t.Object({
        id: t.Number(),
      }),
      response: {
        200: t.Object({ success: t.Boolean() }),
        404: errorSchema,
        500: errorSchema,
      },
      detail: {
        summary: "Delete transaction",
        description:
          "Delete a transaction and revert the associated account balance",
      },
    },
  );
