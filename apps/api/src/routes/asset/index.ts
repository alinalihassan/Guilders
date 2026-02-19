// import type { Static } from "@sinclair/typebox";
// import { and, eq } from "drizzle-orm";
// import { Elysia, t } from "elysia";
// import {
//   asset,
//   insertAssetSchema,
//   selectAssetSchema,
// } from "../../db/schema/assets";
// import { AccountSubtypeEnum, AccountTypeEnum } from "../../db/schema/enums";
// import { institutionConnection } from "../../db/schema/institution-connections";
// import { institution } from "../../db/schema/institutions";
// import { provider } from "../../db/schema/providers";
// import { db } from "../../lib/db";
// import { authPlugin } from "../../middleware/auth";

// // Subtype to type mapping
// const subtypeToType: Record<string, string> = {
//   [AccountSubtypeEnum.depository]: AccountTypeEnum.asset,
//   [AccountSubtypeEnum.brokerage]: AccountTypeEnum.asset,
//   [AccountSubtypeEnum.crypto]: AccountTypeEnum.asset,
//   [AccountSubtypeEnum.property]: AccountTypeEnum.asset,
//   [AccountSubtypeEnum.vehicle]: AccountTypeEnum.asset,
//   [AccountSubtypeEnum.creditcard]: AccountTypeEnum.liability,
//   [AccountSubtypeEnum.loan]: AccountTypeEnum.liability,
//   [AccountSubtypeEnum.stock]: AccountTypeEnum.asset,
// };

// // Institution connection type
// const InstitutionConnectionSchema = t.Object({
//   id: t.Number(),
//   broken: t.Boolean(),
//   institution: t.Object({
//     id: t.Number(),
//     name: t.String(),
//     logo_url: t.String(),
//     provider: t.Object({
//       id: t.Number(),
//       name: t.String(),
//       logo_url: t.String(),
//     }),
//   }),
// });

// // Asset with children type
// const AssetWithChildrenSchema = t.Object({
//   id: t.Number(),
//   name: t.String(),
//   type: t.String(),
//   subtype: t.String(),
//   value: t.Union([t.String(), t.Number()]),
//   currency: t.String(),
//   user_id: t.String(),
//   parent: t.Union([t.Number(), t.Null()]),
//   cost: t.Union([t.String(), t.Number(), t.Null()]),
//   units: t.Union([t.String(), t.Number(), t.Null()]),
//   ticker: t.Union([t.String(), t.Null()]),
//   investable: t.String(),
//   taxability: t.String(),
//   tax_rate: t.Union([t.String(), t.Number(), t.Null()]),
//   notes: t.String(),
//   image: t.Union([t.String(), t.Null()]),
//   provider_account_id: t.Union([t.String(), t.Null()]),
//   institution_connection_id: t.Union([t.Number(), t.Null()]),
//   documents: t.Union([t.Array(t.String()), t.Null()]),
//   created_at: t.Union([t.String(), t.Date()]),
//   updated_at: t.Union([t.String(), t.Date()]),
//   children: t.Array(t.Any()),
//   institution_connection: t.Union([InstitutionConnectionSchema, t.Null()]),
// });

// // Helper function to fetch institution connection with details
// async function fetchInstitutionConnection(connectionId: number) {
//   const icResult = await db
//     .select({
//       institutionConnection: institutionConnection,
//       institution: institution,
//       provider: provider,
//     })
//     .from(institutionConnection)
//     .innerJoin(
//       institution,
//       eq(institutionConnection.institution_id, institution.id),
//     )
//     .innerJoin(provider, eq(institution.provider_id, provider.id))
//     .where(eq(institutionConnection.id, connectionId));

//   if (icResult.length === 0) return null;

//   const result = icResult[0];
//   return {
//     id: result.institutionConnection.id,
//     broken: result.institutionConnection.broken,
//     institution: {
//       id: result.institution.id,
//       name: result.institution.name,
//       logo_url: result.institution.logo_url,
//       provider: {
//         id: result.provider.id,
//         name: result.provider.name,
//         logo_url: result.provider.logo_url,
//       },
//     },
//   };
// }

// // Helper to build hierarchical structure
// async function buildAssetHierarchy(
//   assets: (typeof asset.$inferSelect)[],
//   _userId: string,
// ): Promise<Static<typeof AssetWithChildrenSchema>[]> {
//   const assetMap = new Map<number, Static<typeof AssetWithChildrenSchema>>();
//   const rootAssets: Static<typeof AssetWithChildrenSchema>[] = [];

//   // First pass: create map with institution connections
//   for (const ast of assets) {
//     let institutionConnectionData: Static<
//       typeof InstitutionConnectionSchema
//     > | null = null;

//     if (ast.institution_connection_id) {
//       institutionConnectionData = await fetchInstitutionConnection(
//         ast.institution_connection_id,
//       );
//     }

//     const assetWithMeta: Static<typeof AssetWithChildrenSchema> = {
//       ...ast,
//       children: [],
//       institution_connection: institutionConnectionData,
//       type: ast.type as string,
//       subtype: ast.subtype as string,
//       investable: ast.investable as string,
//       taxability: ast.taxability as string,
//       value: ast.value as string | number,
//       cost: ast.cost as string | number | null,
//       units: ast.units as string | number | null,
//       tax_rate: ast.tax_rate as string | number | null,
//       created_at: ast.created_at as string | Date,
//       updated_at: ast.updated_at as string | Date,
//     };
//     assetMap.set(ast.id, assetWithMeta);
//   }

//   // Second pass: build hierarchy
//   for (const ast of assets) {
//     const assetWithChildren = assetMap.get(ast.id);
//     if (!assetWithChildren) continue;

//     if (ast.parent && assetMap.has(ast.parent)) {
//       const parent = assetMap.get(ast.parent);
//       if (parent) {
//         parent.children.push(assetWithChildren);
//       }
//     } else {
//       rootAssets.push(assetWithChildren);
//     }
//   }

//   return rootAssets;
// }

// export const assetRoutes = new Elysia({ prefix: "/asset" })
//   .use(authPlugin)
//   .model({
//     Asset: selectAssetSchema,
//     CreateAsset: insertAssetSchema,
//   })
//   .get(
//     "",
//     async ({ user }) => {
//       // Get all assets for user
//       const assets = await db
//         .select()
//         .from(asset)
//         .where(eq(asset.user_id, user.id));

//       // Build hierarchical structure
//       const hierarchicalAssets = await buildAssetHierarchy(assets, user.id);

//       return hierarchicalAssets;
//     },
//     {
//       auth: true,
//       response: t.Array(AssetWithChildrenSchema),
//       detail: {
//         summary: "Get all assets",
//         description:
//           "Retrieve all assets for the authenticated user with hierarchical structure",
//         tags: ["Assets"],
//       },
//     },
//   )
//   .post(
//     "",
//     async ({ body, user }) => {
//       const bodyTyped = body as typeof asset.$inferInsert;

//       // Auto-calculate type from subtype
//       const type = subtypeToType[bodyTyped.subtype] || AccountTypeEnum.asset;

//       // Handle liability sign (make value negative for liabilities if positive)
//       let value = parseFloat(bodyTyped.value.toString());
//       if (type === AccountTypeEnum.liability && value > 0) {
//         value = -value;
//       }

//       const [newAsset] = await db
//         .insert(asset)
//         .values({
//           ...bodyTyped,
//           user_id: user.id,
//           type: type as any,
//           value: value.toString(),
//           created_at: new Date(),
//           updated_at: new Date(),
//         })
//         .returning();

//       return {
//         ...newAsset,
//         children: [],
//         institution_connection: null,
//         type: newAsset.type as string,
//         subtype: newAsset.subtype as string,
//         investable: newAsset.investable as string,
//         taxability: newAsset.taxability as string,
//         value: newAsset.value as string | number,
//         cost: newAsset.cost as string | number | null,
//         units: newAsset.units as string | number | null,
//         tax_rate: newAsset.tax_rate as string | number | null,
//         created_at: newAsset.created_at as string | Date,
//         updated_at: newAsset.updated_at as string | Date,
//       };
//     },
//     {
//       auth: true,
//       body: insertAssetSchema,
//       response: AssetWithChildrenSchema,
//       detail: {
//         summary: "Create asset",
//         description:
//           "Create a new asset with auto-calculated type from subtype",
//         tags: ["Assets"],
//       },
//     },
//   )
//   .get(
//     "/:id",
//     async ({ params, user }) => {
//       // Get asset
//       const result = await db
//         .select()
//         .from(asset)
//         .where(and(eq(asset.id, params.id), eq(asset.user_id, user.id)));

//       if (result.length === 0) {
//         throw new Error("Asset not found");
//       }

//       const assetData = result[0];

//       // Get children
//       const children = await db
//         .select()
//         .from(asset)
//         .where(eq(asset.parent, params.id));

//       // Get institution connection details for parent
//       let institutionConnectionData: Static<
//         typeof InstitutionConnectionSchema
//       > | null = null;
//       if (assetData.institution_connection_id) {
//         institutionConnectionData = await fetchInstitutionConnection(
//           assetData.institution_connection_id,
//         );
//       }

//       // Build children with their institution connections
//       const childrenWithData = await Promise.all(
//         children.map(async (child) => {
//           let childIc: Static<typeof InstitutionConnectionSchema> | null = null;
//           if (child.institution_connection_id) {
//             childIc = await fetchInstitutionConnection(
//               child.institution_connection_id,
//             );
//           }
//           return {
//             ...child,
//             children: [],
//             institution_connection: childIc,
//             type: child.type as string,
//             subtype: child.subtype as string,
//             investable: child.investable as string,
//             taxability: child.taxability as string,
//             value: child.value as string | number,
//             cost: child.cost as string | number | null,
//             units: child.units as string | number | null,
//             tax_rate: child.tax_rate as string | number | null,
//             created_at: child.created_at as string | Date,
//             updated_at: child.updated_at as string | Date,
//           };
//         }),
//       );

//       return {
//         ...assetData,
//         children: childrenWithData,
//         institution_connection: institutionConnectionData,
//         type: assetData.type as string,
//         subtype: assetData.subtype as string,
//         investable: assetData.investable as string,
//         taxability: assetData.taxability as string,
//         value: assetData.value as string | number,
//         cost: assetData.cost as string | number | null,
//         units: assetData.units as string | number | null,
//         tax_rate: assetData.tax_rate as string | number | null,
//         created_at: assetData.created_at as string | Date,
//         updated_at: assetData.updated_at as string | Date,
//       };
//     },
//     {
//       auth: true,
//       params: t.Object({
//         id: t.Number(),
//       }),
//       response: AssetWithChildrenSchema,
//       detail: {
//         summary: "Get asset by ID",
//         description: "Retrieve a specific asset with its children",
//         tags: ["Assets"],
//       },
//     },
//   )
//   .put(
//     "/:id",
//     async ({ params, body, user }) => {
//       const bodyTyped = body as typeof asset.$inferInsert;

//       // Get existing asset
//       const existingResult = await db
//         .select()
//         .from(asset)
//         .where(and(eq(asset.id, params.id), eq(asset.user_id, user.id)));

//       if (existingResult.length === 0) {
//         throw new Error("Asset not found");
//       }

//       const existingAsset = existingResult[0];

//       // Recalculate type if subtype changed
//       let type = existingAsset.type;
//       if (bodyTyped.subtype && bodyTyped.subtype !== existingAsset.subtype) {
//         type = subtypeToType[bodyTyped.subtype] || AccountTypeEnum.asset;
//       }

//       // Handle value sign for liabilities
//       let value: number;
//       if (bodyTyped.value !== undefined) {
//         value = parseFloat(bodyTyped.value.toString());
//       } else {
//         value = parseFloat(existingAsset.value.toString());
//       }

//       if (type === AccountTypeEnum.liability && value > 0) {
//         value = -value;
//       }

//       const [updatedAsset] = await db
//         .update(asset)
//         .set({
//           ...bodyTyped,
//           type: type as any,
//           value: value.toString(),
//           updated_at: new Date(),
//         })
//         .where(eq(asset.id, params.id))
//         .returning();

//       // Get children for response
//       const children = await db
//         .select()
//         .from(asset)
//         .where(eq(asset.parent, params.id));

//       return {
//         ...updatedAsset,
//         children: children.map((c) => ({
//           ...c,
//           children: [],
//           institution_connection: null,
//           type: c.type as string,
//           subtype: c.subtype as string,
//           investable: c.investable as string,
//           taxability: c.taxability as string,
//           value: c.value as string | number,
//           cost: c.cost as string | number | null,
//           units: c.units as string | number | null,
//           tax_rate: c.tax_rate as string | number | null,
//           created_at: c.created_at as string | Date,
//           updated_at: c.updated_at as string | Date,
//         })),
//         institution_connection: null,
//         type: updatedAsset.type as string,
//         subtype: updatedAsset.subtype as string,
//         investable: updatedAsset.investable as string,
//         taxability: updatedAsset.taxability as string,
//         value: updatedAsset.value as string | number,
//         cost: updatedAsset.cost as string | number | null,
//         units: updatedAsset.units as string | number | null,
//         tax_rate: updatedAsset.tax_rate as string | number | null,
//         created_at: updatedAsset.created_at as string | Date,
//         updated_at: updatedAsset.updated_at as string | Date,
//       };
//     },
//     {
//       auth: true,
//       params: t.Object({
//         id: t.Number(),
//       }),
//       body: insertAssetSchema,
//       response: AssetWithChildrenSchema,
//       detail: {
//         summary: "Update asset",
//         description:
//           "Update an asset with automatic type recalculation if subtype changed",
//         tags: ["Assets"],
//       },
//     },
//   )
//   .delete(
//     "/:id",
//     async ({ params, user }) => {
//       // Verify asset exists and belongs to user
//       const existingResult = await db
//         .select()
//         .from(asset)
//         .where(and(eq(asset.id, params.id), eq(asset.user_id, user.id)));

//       if (existingResult.length === 0) {
//         throw new Error("Asset not found");
//       }

//       // Delete asset (children will become orphans or should be handled separately)
//       await db.delete(asset).where(eq(asset.id, params.id));

//       return { success: true };
//     },
//     {
//       auth: true,
//       params: t.Object({
//         id: t.Number(),
//       }),
//       response: t.Object({ success: t.Boolean() }),
//       detail: {
//         summary: "Delete asset",
//         description: "Delete an asset",
//         tags: ["Assets"],
//       },
//     },
//   );
