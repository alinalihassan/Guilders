"use client";

import type { Account } from "@guilders/api/types";
import NumberFlow from "@number-flow/react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

import { ChangeIndicator } from "@/components/common/change-indicator";
import { Card, CardContent } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useRates } from "@/lib/queries/useRates";
import { useUser } from "@/lib/queries/useUser";
import { convertToUserCurrency } from "@/lib/utils/financial";

interface CompactBalanceCardProps {
  title: string;
  accounts?: Account[];
  invertColors?: boolean;
  className?: string;
}

// Mock data for the chart (can be replaced with real data later)
const chartData = [
  { month: "Jan", value: 100 },
  { month: "Feb", value: 120 },
  { month: "Mar", value: 150 },
  { month: "Apr", value: 300 },
  { month: "May", value: 280 },
  { month: "Jun", value: 350 },
];

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
  const userCurrency = user?.settings.currency || "EUR";

  // Calculate total value and cost in user's currency
  const totalValue = accounts.reduce(
    (sum, account) =>
      sum + convertToUserCurrency(account.value, account.currency, rates, userCurrency),
    0,
  );

  const totalCost = accounts.reduce(
    (sum, account) =>
      sum + convertToUserCurrency(account.cost || 0, account.currency, rates, userCurrency),
    0,
  );

  // Calculate change
  const change = {
    value: totalCost ? totalValue - totalCost : 0,
    percentage: totalCost ? (totalValue - totalCost) / totalCost : 0,
    currency: userCurrency,
  };

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
              <AreaChart data={chartData}>
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
