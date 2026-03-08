export const ICON_OPTIONS = [
  { value: "", label: "None" },
  { value: "shopping-cart", label: "Shopping" },
  { value: "utensils", label: "Food" },
  { value: "car", label: "Transport" },
  { value: "home", label: "Home" },
  { value: "plane", label: "Travel" },
  { value: "wallet", label: "Wallet" },
] as const;

export type EditState = {
  id: number;
  name: string;
  parent_id: number | null;
  color: string | null;
  icon: string | null;
  classification: "income" | "expense";
};
