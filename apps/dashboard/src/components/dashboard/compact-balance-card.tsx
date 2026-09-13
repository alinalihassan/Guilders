import type { Account } from "@guilders/api/types";
import { useMemo, useState } from "react";

import { BalanceChart } from "@/components/common/balance-chart";
import { ChangeIndicator } from "@/components/common/change-indicator";
import { PeriodSelector } from "@/components/dashboard/period-selector";
import { Card, CardContent } from "@/components/ui/card";
import NumberFlow from "@/components/ui/number-flow";
import { Skeleton } from "@/components/ui/skeleton";
import { type Period, periodPastLabel, useBalanceHistories } from "@/lib/queries/useBalanceHistory";
import { useRates } from "@/lib/queries/useRates";
import { useUser } from "@/lib/queries/useUser";
import { cn } from "@/lib/utils";
import { convertToUserCurrency } from "@/lib/utils/financial";

interface CompactBalanceCardProps {
  title: string;
  accounts?: Account[];
  invertColors?: boolean;
  className?: string;
}

export function CompactBalanceCard({
  title,
  accounts = [],
  invertColors = false,
  className,
}: CompactBalanceCardProps) {
  const [period, setPeriod] = useState<Period>("3M");
  const { data: user } = useUser();
  const { data: rates } = useRates();
  const userCurrency = user?.currency || "EUR";

  const totalValue = accounts.reduce(
    (sum, account) =>
      sum + convertToUserCurrency(account.value, account.currency, rates, userCurrency),
    0,
  );

  const historyQueries = useBalanceHistories(accounts, period);
  const allLoaded = historyQueries.every((q) => q.isSuccess);
  const isLoading = historyQueries.some((q) => q.isLoading);

  const chartData = useMemo(() => {
    if (!allLoaded) return [];

    const dateMap = new Map<string, number>();
    for (const [index, query] of historyQueries.entries()) {
      const snapshots = query.data;
      const account = accounts[index];
      if (!account || !Array.isArray(snapshots)) continue;
      for (const snap of snapshots) {
        const converted = convertToUserCurrency(
          snap.balance,
          account.currency,
          rates,
          userCurrency,
        );
        const dateKey = typeof snap.date === "string" ? snap.date : String(snap.date);
        dateMap.set(dateKey, (dateMap.get(dateKey) ?? 0) + converted);
      }
    }

    return Array.from(dateMap.entries())
      .toSorted(([a], [b]) => a.localeCompare(b))
      .map(([date, val]) => ({ date, value: val }));
  }, [allLoaded, historyQueries, accounts, rates, userCurrency]);

  const hasData = chartData.length >= 2;
  const first = hasData ? chartData[0]!.value : totalValue;

  const { change, trendColor } = useMemo(() => {
    if (hasData) {
      const last = chartData[chartData.length - 1]!.value;
      const diff = last - first;
      const effectiveIsPositive = invertColors ? diff <= 0 : diff >= 0;
      return {
        change: {
          value: diff,
          percentage: first === 0 ? 0 : diff / Math.abs(first),
          currency: userCurrency,
        },
        trendColor:
          diff === 0
            ? "var(--color-gray-400, #9ca3af)"
            : effectiveIsPositive
              ? "var(--color-emerald-500, #10b981)"
              : "var(--color-red-500, #ef4444)",
      };
    }

    if (!allLoaded) {
      return {
        change: { value: 0, percentage: 0, currency: userCurrency },
        trendColor: "var(--color-gray-400, #9ca3af)",
      };
    }

    const totalCost = accounts.reduce(
      (sum, account) =>
        sum + convertToUserCurrency(account.cost || 0, account.currency, rates, userCurrency),
      0,
    );
    const diff = totalCost ? totalValue - totalCost : 0;
    const effectiveIsPositive = invertColors ? diff <= 0 : diff >= 0;
    return {
      change: {
        value: diff,
        percentage: totalCost ? diff / totalCost : 0,
        currency: userCurrency,
      },
      trendColor:
        diff === 0
          ? "var(--color-gray-400, #9ca3af)"
          : effectiveIsPositive
            ? "var(--color-emerald-500, #10b981)"
            : "var(--color-red-500, #ef4444)",
    };
  }, [
    chartData,
    hasData,
    allLoaded,
    accounts,
    rates,
    userCurrency,
    totalValue,
    invertColors,
    first,
  ]);

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
            value={totalValue}
            format={{ style: "currency", currency: userCurrency }}
            className="font-mono text-[2.35rem] leading-none font-normal tracking-tight"
          />
          <ChangeIndicator
            change={change}
            invertColors={invertColors}
            periodLabel={periodPastLabel(period)}
            variant="pill"
          />
        </div>
        <div className="min-h-0 flex-1">
          {isLoading && !chartData.length ? (
            <Skeleton className="h-[160px] w-full rounded-xl" />
          ) : (
            <BalanceChart
              data={chartData}
              hasData={hasData}
              trendColor={trendColor}
              currentValue={totalValue}
              variant="full"
              currency={userCurrency}
              firstValue={first}
              className="aspect-auto h-[160px] w-full"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
