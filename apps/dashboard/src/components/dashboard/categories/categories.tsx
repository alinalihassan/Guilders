import { WalletCards } from "lucide-react";

import NumberFlow from "@/components/ui/number-flow";
import { Skeleton } from "@/components/ui/skeleton";
import type { AccountSubtype } from "@/lib/account-types";
import { getCategoryColor, getCategoryDisplayName } from "@/lib/account-types";
import { useAccounts } from "@/lib/queries/useAccounts";
import { useRates } from "@/lib/queries/useRates";
import { useUser } from "@/lib/queries/useUser";
import { calculateCategories, calculateCategorySums } from "@/lib/utils/financial";

export function NetWorthCategories() {
  const { data: accounts, isLoading, isError, error } = useAccounts();
  const { data: rates } = useRates();
  const { data: user } = useUser();
  const currency = user?.currency ?? "EUR";

  const parentIds = new Set(
    (accounts ?? [])
      .filter((account) => (account as { parent?: number | null }).parent != null)
      .map((account) => (account as { parent?: number | null }).parent as number),
  );
  const leafAccounts = accounts?.filter((account) => !parentIds.has(account.id));
  const categories = calculateCategories(leafAccounts, rates, currency);
  const { positiveSum, negativeSum } = calculateCategorySums(categories);

  if (isError) {
    return <p className="text-destructive text-sm">Could not load allocation: {error.message}</p>;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-1.5 w-full rounded-full" />
        {[0, 1, 2].map((index) => (
          <div key={index} className="flex items-center gap-3">
            <Skeleton className="h-2 w-2 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="ml-auto h-4 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (categories.positive.length === 0 && categories.negative.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center py-8 text-center">
        <WalletCards className="mb-3 h-6 w-6 opacity-50" />
        <p className="text-sm">Add accounts to see your allocation.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {categories.positive.length > 0 && (
        <AllocationGroup
          label="Assets"
          items={categories.positive}
          total={positiveSum}
          currency={currency}
          tone="asset"
        />
      )}
      {categories.negative.length > 0 && (
        <AllocationGroup
          label="Liabilities"
          items={categories.negative}
          total={negativeSum}
          currency={currency}
          tone="liability"
        />
      )}
    </div>
  );
}

function AllocationGroup({
  label,
  items,
  total,
  currency,
  tone,
}: {
  label: string;
  items: { name: AccountSubtype; value: number }[];
  total: number;
  currency: string;
  tone: "asset" | "liability";
}) {
  const rows = [...items].toSorted((left, right) => Math.abs(right.value) - Math.abs(left.value));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span
          className={
            tone === "liability"
              ? "rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-400"
              : "rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
          }
        >
          {label}
        </span>
        <NumberFlow
          value={tone === "liability" ? -Math.abs(total) : total}
          format={{ style: "currency", currency }}
          className="text-muted-foreground font-mono text-xs tabular-nums"
        />
      </div>
      <div className="flex h-1.5 overflow-hidden rounded-full">
        {rows.map((item) => {
          const share = total === 0 ? 0 : (Math.abs(item.value) / total) * 100;
          return (
            <div
              key={item.name}
              className="min-w-0 first:rounded-l-full last:rounded-r-full"
              style={{
                width: `${share}%`,
                backgroundColor: getCategoryColor(item.name),
              }}
            />
          );
        })}
      </div>
      <ul className="flex flex-col gap-2.5">
        {rows.map((item) => {
          const share = total === 0 ? 0 : Math.abs(item.value) / total;
          return (
            <li key={item.name} className="flex items-center gap-3 text-sm">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: getCategoryColor(item.name) }}
              />
              <span className="min-w-0 truncate">{getCategoryDisplayName(item.name)}</span>
              <span className="ml-auto flex items-baseline gap-3 font-mono tabular-nums">
                <NumberFlow
                  value={item.value}
                  format={{ style: "currency", currency }}
                  className="text-sm"
                />
                <span className="text-muted-foreground w-10 text-right text-xs">
                  {(share * 100).toFixed(0)}%
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
