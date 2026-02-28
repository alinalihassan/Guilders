"use client";

import NumberFlow from "@number-flow/react";
import { useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import { ChangeIndicator } from "@/components/common/change-indicator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
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

const chartConfig = {
  value: {
    label: "Value",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

function formatDateTick(dateStr: string, period: Period): string {
  const date = new Date(dateStr + "T00:00:00");
  switch (period) {
    case "1W":
      return date.toLocaleDateString(undefined, { weekday: "short" });
    case "1M":
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    case "3M":
    case "6M":
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    case "1Y":
    case "ALL":
      return date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
    default:
      return dateStr;
  }
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

  const accountHistory = useBalanceHistory(
    !isNetWorth ? accountId : undefined,
    period,
  );
  const netWorthHistory = useNetWorthHistory(
    isNetWorth ? period : undefined,
  );

  const historyQuery = isNetWorth ? netWorthHistory : accountHistory;
  const snapshots = historyQuery.data;
  const isLoading = historyQuery.isLoading;
  const hasHistory = !!accountId || isNetWorth;

  const chartData = snapshots?.map((s) => ({
    date: s.date,
    value: Number(s.balance),
  })) ?? [];

  const historyChange = (() => {
    if (chartData.length < 2) return externalChange;
    const first = chartData[0]!.value;
    const last = chartData[chartData.length - 1]!.value;
    const diff = last - first;
    return {
      value: diff,
      percentage: first === 0 ? 0 : diff / Math.abs(first),
      currency,
    };
  })();

  const displayChange = hasHistory && chartData.length >= 2 ? historyChange : externalChange;
  const displayValue = hasHistory && chartData.length > 0
    ? chartData[chartData.length - 1]!.value
    : value;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-col p-6">
        <div className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-normal">{title}</CardTitle>
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1W">1 Week</SelectItem>
              <SelectItem value="1M">1 Month</SelectItem>
              <SelectItem value="3M">3 Months</SelectItem>
              <SelectItem value="6M">6 Months</SelectItem>
              <SelectItem value="1Y">1 Year</SelectItem>
              <SelectItem value="ALL">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col">
          <NumberFlow
            value={displayValue}
            format={{
              style: "currency",
              currency: currency,
            }}
            className="-mb-0.5 -mt-2.5 font-mono text-4xl font-normal tracking-tight"
          />
          {displayChange && <ChangeIndicator change={displayChange} />}
        </div>
      </CardHeader>
      <CardContent>
        {/* @ts-ignore */}
        <ChartContainer className="relative max-h-[216px] w-full" config={chartConfig}>
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : !hasHistory || chartData.length === 0 ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
              <p className="text-sm text-muted-foreground">
                {hasHistory ? "No history data yet" : "Historical data not available"}
              </p>
            </div>
          ) : null}

          <AreaChart data={chartData.length > 0 ? chartData : [{ date: "", value: 0 }]}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(d: string) => formatDateTick(d, period)}
            />
            <ChartTooltip
              cursor={false}
              content={(props) => <ChartTooltipContent {...props} />}
            />
            <defs>
              <linearGradient id="fillValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <Area
              dataKey="value"
              type="natural"
              fill="url(#fillValue)"
              fillOpacity={0.4}
              stroke="var(--color-value)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
