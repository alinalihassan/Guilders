import { merchant } from "../db/schema/merchants";
import type { Database } from "./db";

const MAX_MERCHANT_NAME_LENGTH = 255;
const SKIP_NAMES = new Set(["no information", ""]);

/**
 * Derives a merchant name from a transaction description.
 * Descriptions are often "Counterparty — Remittance" or "Counterparty"; we use the first part.
 */
export function deriveMerchantNameFromDescription(description: string): string | null {
  const part =
    description
      .split("—")
      .map((s) => s.trim())[0]
      ?.trim() ?? "";
  const lower = part.toLowerCase();
  if (!part || SKIP_NAMES.has(lower)) return null;
  return part.length > MAX_MERCHANT_NAME_LENGTH ? part.slice(0, MAX_MERCHANT_NAME_LENGTH) : part;
}

/**
 * Finds an existing merchant by user and name, or creates one. Returns the merchant id.
 * Uses ON CONFLICT DO NOTHING so concurrent calls for the same name don't violate the unique constraint.
 */
export async function findOrCreateMerchant(
  db: Database,
  userId: string,
  name: string,
): Promise<number> {
  const normalized = name.trim().slice(0, MAX_MERCHANT_NAME_LENGTH);
  if (!normalized) throw new Error("Merchant name is required");

  const existing = await db.query.merchant.findFirst({
    where: { user_id: userId, name: normalized },
  });
  if (existing) return existing.id;

  const [inserted] = await db
    .insert(merchant)
    .values({
      user_id: userId,
      name: normalized,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .onConflictDoNothing({ target: [merchant.user_id, merchant.name] })
    .returning({ id: merchant.id });

  if (inserted) return inserted.id;

  const afterConflict = await db.query.merchant.findFirst({
    where: { user_id: userId, name: normalized },
  });
  if (!afterConflict) throw new Error("Failed to create or find merchant");
  return afterConflict.id;
}
