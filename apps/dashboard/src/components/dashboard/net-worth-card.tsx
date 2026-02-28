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
  const userCurrency = user?.currency ?? "EUR";

  const topLevelAccounts = accounts?.filter(
    (a) => (a as { parent?: number | null }).parent == null,
  );

  const totalValue =
    topLevelAccounts?.reduce((acc, account) => {
      const convertedValue = convertToUserCurrency(
        account.value,
        account.currency,
        rates,
        userCurrency,
      );
      return acc + convertedValue;
    }, 0) ?? 0;

  return (
    <BalanceCard
      title="Net Worth"
      value={totalValue}
      currency={userCurrency}
      isNetWorth
      className={className}
    />
  );
}
