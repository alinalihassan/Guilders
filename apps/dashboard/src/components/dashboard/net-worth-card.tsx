"use client";

import { BalanceCard } from "@/components/dashboard/balance-card";
import { useAccounts } from "@/lib/queries/useAccounts";
import { useRates } from "@/lib/queries/useRates";
import { useUser } from "@/lib/queries/useUser";
import { convertToUserCurrency } from "@/lib/utils/financial";

export function NetWorthCard({ className }: { className?: string }) {
  const { data: accounts } = useAccounts();
  const { data: rates } = useRates();
  const { data: user } = useUser();

  const topLevelAccounts = accounts?.filter(
    (a) => (a as { parent?: number | null }).parent == null,
  );
  const totalValue =
    topLevelAccounts?.reduce((acc, account) => {
      const convertedValue = convertToUserCurrency(
        account.value,
        account.currency,
        rates,
        user?.settings.currency ?? "EUR",
      );
      return acc + convertedValue;
    }, 0) ?? 0;

  const totalCost =
    topLevelAccounts?.reduce((acc, account) => {
      const cost = account.cost ?? account.value;
      const convertedCost = convertToUserCurrency(
        cost,
        account.currency,
        rates,
        user?.settings.currency ?? "EUR",
      );
      return acc + convertedCost;
    }, 0) ?? 0;

  const change = {
    value: totalValue - totalCost,
    percentage: totalCost === 0 ? 0 : (totalValue - totalCost) / totalCost,
    currency: user?.settings.currency ?? "EUR",
  };

  return (
    <BalanceCard
      title="Net Worth"
      value={totalValue}
      currency={user?.settings.currency ?? "EUR"}
      change={change}
      className={className}
    />
  );
}
