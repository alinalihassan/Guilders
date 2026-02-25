import { eq } from "drizzle-orm";

import { category } from "../db/schema/categories";
import type { Database } from "./db";

export const maybeDefaultCategories = [
  { name: "Income", color: "#e99537", icon: "circle-dollar-sign", classification: "income" },
  { name: "Loan Payments", color: "#6471eb", icon: "credit-card", classification: "expense" },
  { name: "Fees", color: "#6471eb", icon: "credit-card", classification: "expense" },
  { name: "Entertainment", color: "#df4e92", icon: "drama", classification: "expense" },
  { name: "Food & Drink", color: "#eb5429", icon: "utensils", classification: "expense" },
  { name: "Shopping", color: "#e99537", icon: "shopping-cart", classification: "expense" },
  { name: "Home Improvement", color: "#6471eb", icon: "house", classification: "expense" },
  { name: "Healthcare", color: "#4da568", icon: "pill", classification: "expense" },
  { name: "Personal Care", color: "#4da568", icon: "pill", classification: "expense" },
  { name: "Services", color: "#4da568", icon: "briefcase", classification: "expense" },
  { name: "Gifts & Donations", color: "#61c9ea", icon: "hand-helping", classification: "expense" },
  { name: "Transportation", color: "#df4e92", icon: "bus", classification: "expense" },
  { name: "Travel", color: "#df4e92", icon: "plane", classification: "expense" },
  { name: "Rent & Utilities", color: "#db5a54", icon: "lightbulb", classification: "expense" },
] as const;

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

export async function seedDefaultCategoriesForUser(db: Database, userId: string) {
  const existingCategories = await db.query.category.findMany({
    where: {
      user_id: userId,
    },
    columns: {
      name: true,
    },
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
