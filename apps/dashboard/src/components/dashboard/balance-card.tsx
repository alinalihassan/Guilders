import { useState } from "react";

import { BalanceChart } from "@/components/common/balance-chart";
import { ChangeIndicator } from "@/components/common/change-indicator";
import { PeriodSelector } from "@/components/dashboard/period-selector";
import { Card, CardContent } from "@/components/ui/card";
import NumberFlow from "@/components/ui/number-flow";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type Period,
  periodPastLabel,
  useBalanceHistory,
  useNetWorthHistory,
} from "@/lib/queries/useBalanceHistory";
import { cn } from "@/lib/utils";

interface BalanceCardProps {
  title: string;
  value: number;
  currency: string;
  change?: {
    value: number;
    percentage: number;
    currency: string;
  };
  accountId?: number;
  isNetWorth?: boolean;
  className?: string;
}

export function BalanceCard({
  title,
  value,
  currency,
  change: externalChange,
  accountId,
  isNetWorth,
  className,
}: BalanceCardProps) {
  const [period, setPeriod] = useState<Period>("3M");

  const accountHistory = useBalanceHistory(!isNetWorth ? accountId : undefined, period);
  const netWorthHistory = useNetWorthHistory(isNetWorth ? period : undefined);

  const historyQuery = isNetWorth ? netWorthHistory : accountHistory;
  const snapshots = historyQuery.data;
  const isLoading = historyQuery.isLoading;

  const chartData = Array.isArray(snapshots)
    ? snapshots.map((s) => ({ date: s.date, value: Number(s.balance) }))
    : [];

  const hasData = chartData.length >= 2;
  const first = hasData ? chartData[0]!.value : value;
  const last = hasData ? chartData[chartData.length - 1]!.value : value;
  const diff = last - first;
  const displayChange = hasData
    ? {
        value: diff,
        percentage: first === 0 ? 0 : diff / Math.abs(first),
        currency,
      }
    : externalChange;
  const trendColor =
    !hasData || diff === 0
      ? "var(--color-gray-400, #9ca3af)"
      : diff > 0
        ? "var(--color-emerald-500, #10b981)"
        : "var(--color-red-500, #ef4444)";

  return (
    <Card className={cn("shadow-none", className)}>
      <CardContent className="flex h-full flex-col gap-5 p-6">
        <div className="flex items-start justify-between gap-3">
          <p className="text-muted-foreground text-[11px] font-medium tracking-[0.16em] uppercase">
            {title}
          </p>
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>
        <div className="flex flex-col gap-2.5">
          <NumberFlow
            value={value}
            format={{ style: "currency", currency }}
            className="font-mono text-[2.35rem] leading-none font-normal tracking-tight"
          />
          {displayChange && (
            <ChangeIndicator
              change={displayChange}
              periodLabel={periodPastLabel(period)}
              variant="pill"
            />
          )}
        </div>
        <div className="min-h-0 flex-1">
          {isLoading && !chartData.length ? (
            <Skeleton className="h-[220px] w-full rounded-xl" />
          ) : (
            <BalanceChart
              data={chartData}
              hasData={hasData}
              trendColor={trendColor}
              currentValue={value}
              variant="full"
              currency={currency}
              firstValue={first}
              className="aspect-auto h-[220px] w-full"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
