import { DEFAULT_CATEGORY_ICON } from "@/lib/utils/category-icons";

export { DEFAULT_CATEGORY_ICON };

/** Cohesive palette: neutrals → warm → nature → cool → purple → pink (7 cols × 4 rows = 28). */
export const PRESET_COLORS = [
  "#64748b", "#475569", "#334155", "#1e293b", // slate
  "#ef4444", "#f97316", "#eab308", "#f59e0b", // warm
  "#22c55e", "#10b981", "#14b8a6", "#84cc16", // nature
  "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1", // cool
  "#8b5cf6", "#a855f7", "#d946ef", "#c026d3", // purple
  "#ec4899", "#f43f5e", "#fb7185", "#e11d48", // pink
  "#94a3b8", "#fbbf24", "#2dd4bf", "#818cf8", // extra
] as const;

/** Same length as PRESET_COLORS so color and icon grids align (7 cols × 4 rows = 28). */
export const ICON_OPTIONS = [
  { value: "circle-dot", label: "Default" },
  { value: "shopping-cart", label: "Shopping" },
  { value: "utensils", label: "Food" },
  { value: "coffee", label: "Coffee" },
  { value: "car", label: "Car" },
  { value: "plane", label: "Travel" },
  { value: "bus", label: "Bus" },
  { value: "home", label: "Home" },
  { value: "building", label: "Rent" },
  { value: "wallet", label: "Wallet" },
  { value: "credit-card", label: "Card" },
  { value: "landmark", label: "Bank" },
  { value: "briefcase", label: "Work" },
  { value: "graduation-cap", label: "Education" },
  { value: "heart-pulse", label: "Health" },
  { value: "baby", label: "Kids" },
  { value: "dog", label: "Pets" },
  { value: "cat", label: "Cat" },
  { value: "shirt", label: "Clothing" },
  { value: "smartphone", label: "Phone" },
  { value: "tv", label: "TV" },
  { value: "music", label: "Music" },
  { value: "film", label: "Movies" },
  { value: "gift", label: "Gifts" },
  { value: "wrench", label: "Repairs" },
  { value: "flower-2", label: "Garden" },
  { value: "receipt", label: "Bills" },
  { value: "circle-dollar-sign", label: "Income" },
] as const;

export type EditState = {
  id: number;
  name: string;
  parent_id: number | null;
  color: string | null;
  icon: string | null;
  classification: "income" | "expense";
};
