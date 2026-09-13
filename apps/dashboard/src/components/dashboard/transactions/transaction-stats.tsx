import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface TransactionStatsProps {
  count: number;
  income: number;
  expenses: number;
  currency: string;
  isLoading: boolean;
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(value);
}

export function TransactionStats({
  count,
  income,
  expenses,
  currency,
  isLoading,
}: TransactionStatsProps) {
  const net = income - expenses;

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
      <Stat label="Transactions" isLoading={isLoading}>
        <p className="font-mono text-lg tracking-tight tabular-nums">{count.toLocaleString()}</p>
      </Stat>
      <Stat label="Expenses" isLoading={isLoading}>
        <p className="font-mono text-lg tracking-tight text-red-600 tabular-nums dark:text-red-400">
          {formatMoney(-Math.abs(expenses), currency)}
        </p>
      </Stat>
      <Stat label="Income" isLoading={isLoading}>
        <p className="font-mono text-lg tracking-tight text-emerald-600 tabular-nums dark:text-emerald-400">
          {formatMoney(income, currency)}
        </p>
      </Stat>
      <Stat label="Net" isLoading={isLoading}>
        <p
          className={cn(
            "font-mono text-lg tabular-nums tracking-tight",
            net > 0 && "text-emerald-600 dark:text-emerald-400",
            net < 0 && "text-red-600 dark:text-red-400",
          )}
        >
          {formatMoney(net, currency)}
        </p>
      </Stat>
    </div>
  );
}

function Stat({
  label,
  isLoading,
  children,
}: {
  label: string;
  isLoading: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-muted-foreground text-[11px] font-medium tracking-[0.16em] uppercase">
        {label}
      </p>
      {isLoading ? <Skeleton className="h-6 w-24" /> : children}
    </div>
  );
}
