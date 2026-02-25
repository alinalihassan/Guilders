import { eq } from "drizzle-orm";

import { category } from "../db/schema/categories";
import type { Database } from "./db";

export const maybeDefaultCategories = [
  { name: "Other Income", color: "#2e8b57", icon: "circle-dollar-sign", classification: "income" },
  { name: "Salary", color: "#1f9d55", icon: "wallet", classification: "income" },
  { name: "Loan Payments", color: "#5b6ee1", icon: "credit-card", classification: "expense" },
  { name: "Fees", color: "#6b7280", icon: "credit-card", classification: "expense" },
  { name: "Entertainment", color: "#d946ef", icon: "drama", classification: "expense" },
  { name: "Food & Drink", color: "#f97316", icon: "utensils", classification: "expense" },
  { name: "Groceries", color: "#f59e0b", icon: "shopping-basket", classification: "expense" },
  { name: "Shopping", color: "#ec4899", icon: "shopping-cart", classification: "expense" },
  { name: "Home Improvement", color: "#6366f1", icon: "house", classification: "expense" },
  { name: "Healthcare", color: "#14b8a6", icon: "pill", classification: "expense" },
  { name: "Personal Care", color: "#22c55e", icon: "pill", classification: "expense" },
  { name: "Services", color: "#0ea5e9", icon: "briefcase", classification: "expense" },
  { name: "Gifts & Donations", color: "#06b6d4", icon: "hand-helping", classification: "expense" },
  { name: "Transportation", color: "#8b5cf6", icon: "bus", classification: "expense" },
  { name: "Car Expenses", color: "#7c3aed", icon: "car", classification: "expense" },
  { name: "Travel", color: "#a855f7", icon: "plane", classification: "expense" },
  { name: "Rent & Utilities", color: "#f43f5e", icon: "lightbulb", classification: "expense" },
  { name: "Other Expenses", color: "#737373", icon: "circle-dashed", classification: "expense" },
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
