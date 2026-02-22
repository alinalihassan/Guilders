export type AccountSubtype =
  | "depository"
  | "brokerage"
  | "crypto"
  | "property"
  | "vehicle"
  | "creditcard"
  | "loan"
  | "stock";

export const accountSubtypes: AccountSubtype[] = [
  "depository",
  "brokerage",
  "crypto",
  "property",
  "vehicle",
  "creditcard",
  "loan",
  "stock",
];

export const accountSubtypeLabels: Record<AccountSubtype, string> = {
  depository: "Depository",
  brokerage: "Brokerage",
  crypto: "Crypto",
  property: "Property",
  vehicle: "Vehicle",
  creditcard: "Credit Card",
  loan: "Loan",
  stock: "Stock",
};

const colorMap: Record<AccountSubtype, string> = {
  depository: "#3e84f7",
  brokerage: "#82d0fa",
  crypto: "#83d1ce",
  property: "#b263ea",
  vehicle: "#5f5fde",
  creditcard: "#FF9F45",
  loan: "#eb4b63",
  stock: "#83d1ce",
};

export function getCategoryColor(categoryName: AccountSubtype): string {
  return colorMap[categoryName] || "#808080";
}

export function getCategoryDisplayName(categoryName: AccountSubtype): string {
  return accountSubtypeLabels[categoryName] || categoryName;
}
