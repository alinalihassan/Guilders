"use client";

import type { Account } from "@guilders/api/types";
import NumberFlow from "@number-flow/react";
import { useQueries } from "@tanstack/react-query";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

import { ChangeIndicator } from "@/components/common/change-indicator";
import { Card, CardContent } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
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

const chartConfig = {
  value: {
    label: "Value",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

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
        const { data, error } = await api
          .account({ id: account.id })
          ["balance-history"].get({ query: range });
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

  const chartData = (() => {
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
      .map(([date, value]) => ({ date, value }));
  })();

  const change = (() => {
    if (chartData.length >= 2) {
      const first = chartData[0]!.value;
      const last = chartData[chartData.length - 1]!.value;
      const diff = last - first;
      return {
        value: diff,
        percentage: first === 0 ? 0 : diff / Math.abs(first),
        currency: userCurrency,
      };
    }
    const totalCost = accounts.reduce(
      (sum, account) =>
        sum + convertToUserCurrency(account.cost || 0, account.currency, rates, userCurrency),
      0,
    );
    return {
      value: totalCost ? totalValue - totalCost : 0,
      percentage: totalCost ? (totalValue - totalCost) / totalCost : 0,
      currency: userCurrency,
    };
  })();

  return (
    <Card className={className}>
      <CardContent className="flex gap-4 p-6">
        <div className="flex-1">
          <h3 className="mb-1 text-sm font-medium text-muted-foreground">{title}</h3>
          <NumberFlow
            value={totalValue}
            format={{
              style: "currency",
              currency: userCurrency,
            }}
            className="font-mono text-2xl font-normal tracking-tight"
          />
          <ChangeIndicator change={change} invertColors={invertColors} />
        </div>

        <div className="w-32">
          {/* @ts-ignore */}
          <ChartContainer className="h-[80px]" config={chartConfig}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.length > 0 ? chartData : [{ date: "", value: 0 }]}>
                <defs>
                  <linearGradient id="fillValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Area
                  dataKey="value"
                  type="monotone"
                  fill="url(#fillValue)"
                  fillOpacity={0.4}
                  stroke="var(--color-value)"
                  strokeWidth={1.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
