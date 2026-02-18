import { and, eq } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-typebox";
import { Elysia, t } from "elysia";
import { asset } from "../../db/schema/assets";
import { transaction } from "../../db/schema/transactions";
import { db } from "../../lib/db";
import { authPlugin } from "../../middleware/auth";

const selectTransactionSchema = createSelectSchema(transaction);
const insertTransactionSchema = createInsertSchema(transaction);

export const transactionRoutes = new Elysia({ prefix: "/transaction" })
  .use(authPlugin)
  .model({
    Transaction: selectTransactionSchema,
    CreateTransaction: insertTransactionSchema,
  })
  .get(
    "",
    async ({ user, query }) => {
      // Get user's assets first
      const userAssets = await db
        .select({ id: asset.id })
        .from(asset)
        .where(eq(asset.user_id, user.id));

      const assetIds = userAssets.map((a) => a.id);

      if (assetIds.length === 0) {
        return [];
      }

      // If assetId filter provided
      if (query.assetId) {
        const assetIdsSet = new Set(assetIds);
        if (!assetIdsSet.has(query.assetId)) {
          return [];
        }

        return await db
          .select()
          .from(transaction)
          .where(eq(transaction.asset_id, query.assetId));
      }

      // Get all transactions for user's assets
      const allTransactions: (typeof transaction.$inferSelect)[] = [];
      for (const assetId of assetIds) {
        const assetTransactions = await db
          .select()
          .from(transaction)
          .where(eq(transaction.asset_id, assetId));
        allTransactions.push(...assetTransactions);
      }

      // Sort by date desc
      return allTransactions.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
    },
    {
      auth: true,
      query: t.Object({
        assetId: t.Optional(t.Number()),
      }),
      response: t.Array(selectTransactionSchema),
      detail: {
        summary: "Get all transactions",
        description:
          "Retrieve all transactions for the authenticated user, optionally filtered by asset",
        tags: ["Transactions"],
      },
    },
  )
  .post(
    "",
    async ({ body, user }) => {
      const bodyTyped = body as typeof transaction.$inferInsert;

      // Verify the asset belongs to the user
      const assetResult = await db
        .select()
        .from(asset)
        .where(
          and(eq(asset.id, bodyTyped.asset_id), eq(asset.user_id, user.id)),
        );

      if (assetResult.length === 0 || !assetResult[0]) {
        throw new Error("Asset not found or access denied");
      }

      const targetAsset = assetResult[0];
      const amount = parseFloat(bodyTyped.amount.toString());

      // Update asset value
      const currentValue = parseFloat(targetAsset.value.toString());
      const newValue = currentValue + amount;

      await db
        .update(asset)
        .set({ value: newValue.toString(), updated_at: new Date() })
        .where(eq(asset.id, bodyTyped.asset_id));

      // Create transaction
      const [newTransaction] = await db
        .insert(transaction)
        .values({
          asset_id: bodyTyped.asset_id,
          amount: bodyTyped.amount,
          currency: bodyTyped.currency,
          date: bodyTyped.date,
          description: bodyTyped.description,
          category: bodyTyped.category || "uncategorized",
          provider_transaction_id: bodyTyped.provider_transaction_id || null,
          documents: bodyTyped.documents || null,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();

      if (newTransaction === undefined) {
        throw new Error("Failed to create transaction");
      }

      return newTransaction;
    },
    {
      auth: true,
      body: insertTransactionSchema,
      response: selectTransactionSchema,
      detail: {
        summary: "Create transaction",
        description:
          "Create a new transaction and update the associated account balance",
        tags: ["Transactions"],
      },
    },
  )
  .get(
    "/:id",
    async ({ params, user }) => {
      // Get user's assets
      const userAssets = await db
        .select({ id: asset.id })
        .from(asset)
        .where(eq(asset.user_id, user.id));

      const assetIds = userAssets.map((a) => a.id);

      if (assetIds.length === 0) {
        throw new Error("Transaction not found");
      }

      // Get transaction and verify ownership through asset
      const result = await db
        .select()
        .from(transaction)
        .where(eq(transaction.id, params.id));

      if (result.length === 0 || !result[0]) {
        throw new Error("Transaction not found");
      }

      const transactionData = result[0];
      if (!assetIds.includes(transactionData.asset_id)) {
        throw new Error("Transaction not found");
      }

      return transactionData;
    },
    {
      auth: true,
      params: t.Object({
        id: t.Number(),
      }),
      response: selectTransactionSchema,
      detail: {
        summary: "Get transaction by ID",
        description: "Retrieve a specific transaction by its ID",
        tags: ["Transactions"],
      },
    },
  )
  .put(
    "/:id",
    async ({ params, body, user }) => {
      const bodyTyped = body as typeof transaction.$inferInsert;

      // Verify the asset belongs to the user
      const assetResult = await db
        .select()
        .from(asset)
        .where(
          and(eq(asset.id, bodyTyped.asset_id), eq(asset.user_id, user.id)),
        );

      if (assetResult.length === 0 || !assetResult[0]) {
        throw new Error("Asset not found or access denied");
      }

      // Get existing transaction
      const existingResult = await db
        .select()
        .from(transaction)
        .where(eq(transaction.id, params.id));

      if (existingResult.length === 0 || !existingResult[0]) {
        throw new Error("Transaction not found");
      }

      const existingTransaction = existingResult[0];
      const targetAsset = assetResult[0];

      // Verify ownership of existing transaction
      if (targetAsset.user_id !== user.id) {
        throw new Error("Transaction not found");
      }

      // Calculate value adjustment
      const oldAmount = parseFloat(existingTransaction.amount.toString());
      const newAmount = parseFloat(bodyTyped.amount.toString());
      const amountDiff = newAmount - oldAmount;

      // Update asset value
      const currentValue = parseFloat(targetAsset.value.toString());
      const newValue = currentValue + amountDiff;

      await db
        .update(asset)
        .set({ value: newValue.toString(), updated_at: new Date() })
        .where(eq(asset.id, bodyTyped.asset_id));

      // Update transaction
      const [updatedTransaction] = await db
        .update(transaction)
        .set({
          asset_id: bodyTyped.asset_id,
          amount: bodyTyped.amount,
          currency: bodyTyped.currency,
          date: bodyTyped.date,
          description: bodyTyped.description,
          category: bodyTyped.category || existingTransaction.category,
          provider_transaction_id:
            bodyTyped.provider_transaction_id ||
            existingTransaction.provider_transaction_id,
          documents: bodyTyped.documents || existingTransaction.documents,
          updated_at: new Date(),
        })
        .where(eq(transaction.id, params.id))
        .returning();

      if (updatedTransaction === undefined) {
        throw new Error("Failed to update transaction");
      }

      return updatedTransaction;
    },
    {
      auth: true,
      params: t.Object({
        id: t.Number(),
      }),
      body: insertTransactionSchema,
      response: selectTransactionSchema,
      detail: {
        summary: "Update transaction",
        description:
          "Update a transaction and adjust the associated account balance",
        tags: ["Transactions"],
      },
    },
  )
  .delete(
    "/:id",
    async ({ params, user }) => {
      // Get user's assets
      const userAssets = await db
        .select({ id: asset.id })
        .from(asset)
        .where(eq(asset.user_id, user.id));

      const assetIds = userAssets.map((a) => a.id);

      if (assetIds.length === 0) {
        throw new Error("Transaction not found");
      }

      // Get existing transaction
      const existingResult = await db
        .select()
        .from(transaction)
        .where(eq(transaction.id, params.id));

      if (existingResult.length === 0 || !existingResult[0]) {
        throw new Error("Transaction not found");
      }

      const existingTransaction = existingResult[0];

      // Verify ownership
      if (!assetIds.includes(existingTransaction.asset_id)) {
        throw new Error("Transaction not found");
      }

      // Get asset for balance update
      const assetResult = await db
        .select()
        .from(asset)
        .where(eq(asset.id, existingTransaction.asset_id));

      if (assetResult.length === 0 || !assetResult[0]) {
        throw new Error("Associated asset not found");
      }

      const targetAsset = assetResult[0];
      const amount = parseFloat(existingTransaction.amount.toString());

      // Revert asset value
      const currentValue = parseFloat(targetAsset.value.toString());
      const newValue = currentValue - amount;

      await db
        .update(asset)
        .set({ value: newValue.toString(), updated_at: new Date() })
        .where(eq(asset.id, existingTransaction.asset_id));

      // Delete transaction
      await db.delete(transaction).where(eq(transaction.id, params.id));

      return { success: true };
    },
    {
      auth: true,
      params: t.Object({
        id: t.Number(),
      }),
      response: t.Object({ success: t.Boolean() }),
      detail: {
        summary: "Delete transaction",
        description:
          "Delete a transaction and revert the associated account balance",
        tags: ["Transactions"],
      },
    },
  );
