"use client";

import type { Account } from "@guilders/api/types";
import NumberFlow from "@number-flow/react";
import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";

import { BalanceChart } from "@/components/common/balance-chart";
import { ChangeIndicator } from "@/components/common/change-indicator";
import { Card, CardContent } from "@/components/ui/card";
import { api, edenError } from "@/lib/api";
import { balanceHistoryKey, periodToDateRange } from "@/lib/queries/useBalanceHistory";
import { useRates } from "@/lib/queries/useRates";
import { useUser } from "@/lib/queries/useUser";
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
  const { data: user } = useUser();
  const { data: rates } = useRates();
  const userCurrency = user?.currency || "EUR";

  const totalValue = accounts.reduce(
    (sum, account) =>
      sum + convertToUserCurrency(account.value, account.currency, rates, userCurrency),
    0,
  );

  const range = periodToDateRange("1M");

  const historyQueries = useQueries({
    queries: accounts.map((account) => ({
      queryKey: balanceHistoryKey(account.id, "1M"),
      queryFn: async () => {
        const { data, error } = await api.account({ id: account.id })["balance-history"].get({
          query: range,
        });
        if (error) throw new Error(edenError(error));
        return {
          accountId: account.id,
          currency: account.currency,
          snapshots: (data as { snapshots: Array<{ date: string; balance: string }> }).snapshots,
        };
      },
    })),
  });

  const allLoaded = historyQueries.every((q) => q.isSuccess);

  const chartData = useMemo(() => {
    if (!allLoaded) return [];

    const dateMap = new Map<string, number>();
    for (const query of historyQueries) {
      if (!query.data) continue;
      const { currency: accountCurrency, snapshots } = query.data;
      for (const snap of snapshots) {
        const converted = convertToUserCurrency(snap.balance, accountCurrency, rates, userCurrency);
        dateMap.set(snap.date, (dateMap.get(snap.date) ?? 0) + converted);
      }
    }

    return Array.from(dateMap.entries())
      .toSorted(([a], [b]) => a.localeCompare(b))
      .map(([date, val]) => ({ date, value: val }));
  }, [allLoaded, historyQueries, rates, userCurrency]);

  const hasData = chartData.length >= 2;

  const { change, trendColor } = useMemo(() => {
    if (hasData) {
      const first = chartData[0]!.value;
      const last = chartData[chartData.length - 1]!.value;
      const diff = last - first;
      const effectiveIsPositive = invertColors ? diff <= 0 : diff >= 0;
      return {
        change: {
          value: diff,
          percentage: first === 0 ? 0 : diff / Math.abs(first),
          currency: userCurrency,
        },
        trendColor: effectiveIsPositive
          ? "var(--color-green-500, #22c55e)"
          : "var(--color-red-500, #ef4444)",
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
      trendColor: effectiveIsPositive
        ? "var(--color-green-500, #22c55e)"
        : "var(--color-red-500, #ef4444)",
    };
  }, [chartData, hasData, accounts, rates, userCurrency, totalValue, invertColors]);

  return (
    <Card className={className}>
      <CardContent className="flex gap-4 p-6">
        <div className="flex-1">
          <h3 className="mb-1 text-sm font-medium text-muted-foreground">{title}</h3>
          <NumberFlow
            value={totalValue}
            format={{ style: "currency", currency: userCurrency }}
            className="font-mono text-2xl font-normal tracking-tight"
          />
          <ChangeIndicator change={change} invertColors={invertColors} periodLabel="1 month" />
        </div>

        <div className="w-32">
          <BalanceChart
            data={chartData}
            hasData={hasData}
            trendColor={trendColor}
            currentValue={totalValue}
            variant="sparkline"
            className="h-[80px]"
          />
        </div>
      </CardContent>
    </Card>
  );
}
