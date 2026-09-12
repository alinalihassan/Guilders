import { z } from "zod";

import type { InsertMerchant, Merchant as DbMerchant } from "../../db/schema/merchants";

export const createMerchantSchema = z.object({
  name: z.string(),
  logo_url: z.string().nullable().optional(),
  website_url: z.string().nullable().optional(),
});

export type Merchant = DbMerchant;
export type Merchants = Merchant[];
export type MerchantInsert = Omit<InsertMerchant, "id" | "user_id" | "created_at" | "updated_at">;
