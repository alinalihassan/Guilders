import { and, eq } from "drizzle-orm";
import { Elysia, status, t } from "elysia";
import {
  asset,
  insertAssetSchema,
  selectAssetSchema,
} from "../../db/schema/assets";
import { AccountSubtypeEnum, AccountTypeEnum } from "../../db/schema/enums";
import { db } from "../../lib/db";
import { authPlugin } from "../../middleware/auth";
import { errorSchema } from "../../utils/error";

// Subtype to type mapping
const subtypeToType: Record<string, string> = {
  [AccountSubtypeEnum.depository]: AccountTypeEnum.asset,
  [AccountSubtypeEnum.brokerage]: AccountTypeEnum.asset,
  [AccountSubtypeEnum.crypto]: AccountTypeEnum.asset,
  [AccountSubtypeEnum.property]: AccountTypeEnum.asset,
  [AccountSubtypeEnum.vehicle]: AccountTypeEnum.asset,
  [AccountSubtypeEnum.creditcard]: AccountTypeEnum.liability,
  [AccountSubtypeEnum.loan]: AccountTypeEnum.liability,
  [AccountSubtypeEnum.stock]: AccountTypeEnum.asset,
};

export const assetRoutes = new Elysia({
  prefix: "/asset",
  detail: {
    tags: ["Assets"],
    security: [{ bearerAuth: [] }],
  }
})
  .use(authPlugin)
  .model({
    Asset: selectAssetSchema,
    CreateAsset: insertAssetSchema,
  })
  .get(
    "",
    async ({ user }) => {
      const assets = await db.query.asset.findMany({
        where: {
          user_id: user.id,
        },
        with: {
          institutionConnection: {
            with: {
              institution: {
                with: {
                  provider: true,
                },
              },
            },
          },
        },
      });

      // Calculate total value and group by type
      let totalValue = 0;
      const assetsByType: Record<string, typeof assets> = {};

      for (const ast of assets) {
        const value = parseFloat(ast.value.toString());
        if (ast.type === AccountTypeEnum.liability) {
          totalValue -= value;
        } else {
          totalValue += value;
        }

        const assetType = ast.type as string;
        if (!assetsByType[assetType]) {
          assetsByType[assetType] = [];
        }
        assetsByType[assetType].push(ast);
      }

      return {
        totalValue: totalValue.toString(),
        assets,
        assetsByType,
      };
    },
    {
      auth: true,
      response: t.Object({
        totalValue: t.String(),
        assets: t.Array(t.Ref("#/components/schemas/Asset")),
        assetsByType: t.Record(t.String(), t.Array(t.Ref("#/components/schemas/Asset"))),
      }),
      detail: {
        summary: "Get all assets",
        description:
          "Retrieve all assets for the authenticated user with total value calculation",
      },
    },
  )
  .post(
    "",
    async ({ body, user }) => {
      // Auto-calculate type from subtype
      const type = subtypeToType[body.subtype] || AccountTypeEnum.asset;

      // Handle liability sign (make value negative for liabilities if positive)
      let value = parseFloat(body.value?.toString() || "0");
      if (type === AccountTypeEnum.liability && value > 0) {
        value = -value;
      }

      const [newAsset] = await db
        .insert(asset)
        .values({
          ...body,
          user_id: user.id,
          type: type as AccountTypeEnum,
          value: value.toString(),
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();

      if (!newAsset) {
        return status(500, { error: "Failed to create asset" });
      }

      return newAsset;
    },
    {
      auth: true,
      body: insertAssetSchema,
      response: {
        200: t.Ref("#/components/schemas/Asset"),
        500: errorSchema,
      },
      detail: {
        summary: "Create asset",
        description:
          "Create a new asset with auto-calculated type from subtype",
      },
    },
  )
  .get(
    "/:id",
    async ({ params, user }) => {
      const assetResult = await db.query.asset.findFirst({
        where: {
          id: params.id,
          user_id: user.id,
        },
        with: {
          institutionConnection: {
            with: {
              institution: {
                with: {
                  provider: true,
                },
              },
            },
          },
        },
      });

      if (!assetResult) {
        return status(404, { error: "Asset not found" });
      }

      // Get children
      const children = await db.query.asset.findMany({
        where: {
          parent: params.id,
        },
      });

      return {
        asset: assetResult,
        children,
      };
    },
    {
      auth: true,
      params: t.Object({
        id: t.Number(),
      }),
      response: {
        200: t.Object({
          asset: t.Ref("#/components/schemas/Asset"),
          children: t.Array(t.Ref("#/components/schemas/Asset")),
        }),
        404: errorSchema,
      },
      detail: {
        summary: "Get asset by ID",
        description: "Retrieve a specific asset with its children",
      },
    },
  )
  .put(
    "/:id",
    async ({ params, body, user }) => {
      // Get existing asset
      const existingAsset = await db.query.asset.findFirst({
        where: {
          id: params.id,
          user_id: user.id,
        },
      });

      if (!existingAsset) {
        return status(404, { error: "Asset not found" });
      }

      // Recalculate type if subtype changed
      let type: AccountTypeEnum = existingAsset.type;
      if (body.subtype && body.subtype !== existingAsset.subtype) {
        type = (subtypeToType[body.subtype] || AccountTypeEnum.asset) as AccountTypeEnum;
      }

      // Handle value sign for liabilities
      let value: number;
      if (body.value !== undefined) {
        value = parseFloat(body.value.toString());
      } else {
        value = parseFloat(existingAsset.value.toString());
      }

      if (type === AccountTypeEnum.liability && value > 0) {
        value = -value;
      }

      const [updatedAsset] = await db
        .update(asset)
        .set({
          ...body,
          type: type as AccountTypeEnum,
          value: value.toString(),
          updated_at: new Date(),
        })
        .where(and(eq(asset.id, params.id), eq(asset.user_id, user.id)))
        .returning();

      if (!updatedAsset) {
        return status(500, { error: "Failed to update asset" });
      }

      return updatedAsset;
    },
    {
      auth: true,
      params: t.Object({
        id: t.Number(),
      }),
      body: insertAssetSchema,
      response: {
        200: t.Ref("#/components/schemas/Asset"),
        404: errorSchema,
        500: errorSchema,
      },
      detail: {
        summary: "Update asset",
        description:
          "Update an asset with automatic type recalculation if subtype changed",
      },
    },
  )
  .delete(
    "/:id",
    async ({ params, user }) => {
      // Verify asset exists and belongs to user
      const existingAsset = await db.query.asset.findFirst({
        where: {
          id: params.id,
          user_id: user.id,
        },
      });

      if (!existingAsset) {
        return status(404, { error: "Asset not found" });
      }

      await db.transaction(async (tx) => {
        // Delete children first
        await tx.delete(asset).where(eq(asset.parent, params.id));
        // Delete the asset
        await tx.delete(asset).where(eq(asset.id, params.id));
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
      },
      detail: {
        summary: "Delete asset",
        description: "Delete an asset and all its children",
      },
    },
  );
