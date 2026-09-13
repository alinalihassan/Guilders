import { eq } from "drizzle-orm";

import { category } from "../db/schema/categories";
import { transaction } from "../db/schema/transactions";
import type { Database } from "./db";

export const maybeDefaultCategories = [
  { name: "Other Income", color: "#2e8b57", icon: "circle-dollar-sign", classification: "income" },
  { name: "Salary", color: "#1f9d55", icon: "wallet", classification: "income" },
  { name: "Investments", color: "#15803d", icon: "trending-up", classification: "income" },
  { name: "Transfers", color: "#0f766e", icon: "arrow-left-right", classification: "income" },
  {
    name: "Childcare & Education",
    color: "#d97706",
    icon: "graduation-cap",
    classification: "expense",
  },
  { name: "Drinks & Dining", color: "#f97316", icon: "utensils", classification: "expense" },
  { name: "Entertainment", color: "#d946ef", icon: "film", classification: "expense" },
  { name: "Financial", color: "#4f46e5", icon: "landmark", classification: "expense" },
  { name: "Fitness", color: "#65a30d", icon: "dumbbell", classification: "expense" },
  { name: "Groceries", color: "#f59e0b", icon: "shopping-basket", classification: "expense" },
  { name: "Healthcare", color: "#14b8a6", icon: "heart-pulse", classification: "expense" },
  { name: "Hobbies", color: "#c026d3", icon: "palette", classification: "expense" },
  { name: "Household", color: "#0ea5e9", icon: "house", classification: "expense" },
  { name: "Insurance", color: "#2563eb", icon: "shield", classification: "expense" },
  { name: "Personal Care", color: "#22c55e", icon: "sparkles", classification: "expense" },
  { name: "Pets", color: "#ea580c", icon: "dog", classification: "expense" },
  { name: "Rent & Mortgage", color: "#78716c", icon: "building", classification: "expense" },
  { name: "Shopping", color: "#ec4899", icon: "shopping-cart", classification: "expense" },
  { name: "Subscriptions", color: "#7c3aed", icon: "repeat", classification: "expense" },
  { name: "Taxes", color: "#84cc16", icon: "receipt", classification: "expense" },
  { name: "Transport", color: "#64748b", icon: "car", classification: "expense" },
  { name: "Travel", color: "#a855f7", icon: "plane", classification: "expense" },
  { name: "Utilities", color: "#f59e0b", icon: "lightbulb", classification: "expense" },
  { name: "Other Expenses", color: "#737373", icon: "circle-dashed", classification: "expense" },
] as const;

/** Old default names → current defaults. Merge when the target already exists. */
export const LEGACY_CATEGORY_RENAMES: Record<string, string> = {
  "Car Expenses": "Transport",
  Transportation: "Transport",
  "Food & Drink": "Drinks & Dining",
  "Rent & Utilities": "Rent & Mortgage",
  Services: "Subscriptions",
  "Loan Payments": "Financial",
  Fees: "Financial",
  "Home Improvement": "Household",
};

function buildDefaultCategoryRows(userId: string) {
  const now = new Date();
  return maybeDefaultCategories.map((item) => ({
    user_id: userId,
    name: item.name,
    color: item.color,
    icon: item.icon,
    classification: item.classification,
    created_at: now,
    updated_at: now,
  }));
}

function defaultByName(name: string) {
  return maybeDefaultCategories.find((item) => item.name === name);
}

async function alignLegacyCategories(db: Database, userId: string) {
  const existing = await db.query.category.findMany({
    where: { user_id: userId },
  });
  const byName = new Map(existing.map((item) => [item.name, item]));

  for (const [from, to] of Object.entries(LEGACY_CATEGORY_RENAMES)) {
    const source = byName.get(from);
    if (!source) continue;
    const target = byName.get(to);
    const now = new Date();

    if (target && target.id !== source.id) {
      await db
        .update(transaction)
        .set({ category_id: target.id, updated_at: now })
        .where(eq(transaction.category_id, source.id));
      await db
        .update(category)
        .set({ parent_id: target.id })
        .where(eq(category.parent_id, source.id));
      await db.delete(category).where(eq(category.id, source.id));
      byName.delete(from);
      continue;
    }

    const def = defaultByName(to);
    await db
      .update(category)
      .set({
        name: to,
        icon: def?.icon ?? source.icon,
        color: def?.color ?? source.color,
        classification: def?.classification ?? source.classification,
        updated_at: now,
      })
      .where(eq(category.id, source.id));
    byName.delete(from);
    byName.set(to, { ...source, name: to });
  }
}

export async function seedDefaultCategoriesForUser(db: Database, userId: string) {
  await alignLegacyCategories(db, userId);

  const existingCategories = await db.query.category.findMany({
    where: { user_id: userId },
    columns: { name: true },
  });

  const existingCategoryNames = new Set(existingCategories.map((item) => item.name.toLowerCase()));
  const categoriesToInsert = buildDefaultCategoryRows(userId).filter(
    (item) => !existingCategoryNames.has(item.name.toLowerCase()),
  );

  if (categoriesToInsert.length > 0) {
    await db.insert(category).values(categoriesToInsert);
  }
}

export async function resetCategoriesToDefaultsForUser(db: Database, userId: string) {
  await db.transaction(async (tx) => {
    await tx.delete(category).where(eq(category.user_id, userId));
    await tx.insert(category).values(buildDefaultCategoryRows(userId));
  });
}
