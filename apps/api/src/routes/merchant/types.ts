import { t } from "elysia";

import type { InsertMerchant, Merchant as DbMerchant } from "../../db/schema/merchants";

export const merchantIdParamSchema = t.Object({
  id: t.Numeric({ description: "Merchant ID" }),
});

export const createMerchantSchema = t.Object({
  name: t.String({ description: "Merchant name" }),
  logo_url: t.Optional(t.Union([t.String({ description: "Merchant logo URL" }), t.Null()])),
  website_url: t.Optional(t.Union([t.String({ description: "Merchant website URL" }), t.Null()])),
});

export type Merchant = DbMerchant;
export type Merchants = Merchant[];
export type MerchantInsert = Omit<InsertMerchant, "id" | "user_id" | "created_at" | "updated_at">;
