import type { Account, Rate } from "@guilders/api/types";

import type { AccountSubtype } from "@/lib/account-types";

export function convertToUserCurrency(
  value: number | string,
  fromCurrency: string,
  rates: Rate[] | undefined,
  userCurrency: string,
) {
  const numValue = Number(value);
  if (Number.isNaN(numValue)) return 0;
  if (!rates) return numValue;
  if (fromCurrency === userCurrency) return numValue;

  const fromRate = Number(rates.find((r) => r.currency_code === fromCurrency)?.rate ?? 1) || 1;
  const toRate = Number(rates.find((r) => r.currency_code === userCurrency)?.rate ?? 1) || 1;

  return (numValue * toRate) / fromRate;
}

interface CategoryGroups {
  positive: CategoryItem[];
  negative: CategoryItem[];
}

interface CategoryItem {
  name: AccountSubtype;
  value: number;
}

export function calculateCategories(
  accounts: Account[] | undefined,
  rates: Rate[] | undefined,
  userCurrency: string,
): CategoryGroups {
  if (!accounts) return { positive: [], negative: [] };

  const categoryMap: Record<AccountSubtype, number> = {
    depository: 0,
    brokerage: 0,
    crypto: 0,
    property: 0,
    vehicle: 0,
    creditcard: 0,
    loan: 0,
    stock: 0,
  };

  for (const account of accounts) {
    const convertedValue = convertToUserCurrency(
      account.value,
      account.currency,
      rates,
      userCurrency,
    );
    categoryMap[account.subtype as AccountSubtype] += convertedValue;
  }

  const categoriesArray = Object.entries(categoryMap)
    .map(([name, value]) => ({ name: name as AccountSubtype, value }))
    .filter((category) => category.value !== 0);

  return {
    positive: categoriesArray.filter((c) => c.value > 0),
    negative: categoriesArray.filter((c) => c.value < 0),
  };
}

export function calculateCategorySums(categories: CategoryGroups) {
  return {
    positiveSum: categories.positive.reduce((sum, category) => sum + category.value, 0),
    negativeSum: Math.abs(categories.negative.reduce((sum, category) => sum + category.value, 0)),
  };
}
