"use client";

import NumberFlow from "@number-flow/react";
import { useMemo, useState } from "react";

import { BalanceChart } from "@/components/common/balance-chart";
import { ChangeIndicator } from "@/components/common/change-indicator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type Period,
  useBalanceHistory,
  useNetWorthHistory,
} from "@/lib/queries/useBalanceHistory";

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
  const [period, setPeriod] = useState<Period>("1M");

  const accountHistory = useBalanceHistory(!isNetWorth ? accountId : undefined, period);
  const netWorthHistory = useNetWorthHistory(isNetWorth ? period : undefined);

  const historyQuery = isNetWorth ? netWorthHistory : accountHistory;
  const snapshots = historyQuery.data;
  const isLoading = historyQuery.isLoading;

  const chartData = useMemo(
    () =>
      Array.isArray(snapshots)
        ? snapshots.map((s) => ({ date: s.date, value: Number(s.balance) }))
        : [],
    [snapshots],
  );

  const hasData = chartData.length >= 2;

  const { displayChange, trendColor } = useMemo(() => {
    if (!hasData) {
      return {
        displayChange: externalChange,
        trendColor: "var(--color-gray-400, #9ca3af)",
      };
    }
    const first = chartData[0]!.value;
    const last = chartData[chartData.length - 1]!.value;
    const diff = last - first;
    const change = {
      value: diff,
      percentage: first === 0 ? 0 : diff / Math.abs(first),
      currency,
    };
    const color =
      diff > 0
        ? "var(--color-green-500, #22c55e)"
        : diff < 0
          ? "var(--color-red-500, #ef4444)"
          : "var(--color-gray-400, #9ca3af)";
    return {
      displayChange: change,
      trendColor: color,
    };
  }, [chartData, hasData, currency, externalChange]);

  const firstValue = hasData ? chartData[0]!.value : value;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-col p-6">
        <div className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-normal">{title}</CardTitle>
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-[80px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1W">1W</SelectItem>
              <SelectItem value="1M">1M</SelectItem>
              <SelectItem value="3M">3M</SelectItem>
              <SelectItem value="6M">6M</SelectItem>
              <SelectItem value="1Y">1Y</SelectItem>
              <SelectItem value="ALL">ALL</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col">
          <NumberFlow
            value={value}
            format={{ style: "currency", currency }}
            className="-mb-0.5 -mt-2.5 font-mono text-4xl font-normal tracking-tight"
          />
          {displayChange && <ChangeIndicator change={displayChange} periodLabel={period} />}
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        {isLoading ? (
          <Skeleton className="h-[216px] w-full" />
        ) : (
          <BalanceChart
            data={chartData}
            hasData={hasData}
            trendColor={trendColor}
            currentValue={value}
            variant="full"
            currency={currency}
            firstValue={firstValue}
          />
        )}
      </CardContent>
    </Card>
  );
}
