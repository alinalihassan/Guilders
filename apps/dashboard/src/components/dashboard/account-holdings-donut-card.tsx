"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useRates } from "@/lib/queries/useRates";
import { useUser } from "@/lib/queries/useUser";
import { cn } from "@/lib/utils";
import { convertToUserCurrency } from "@/lib/utils/financial";

type AccountWithValue = {
  id: number;
  name: string;
  subtype: string;
  value: string;
  currency: string;
};

const CHART_COLORS = [
  "#3e84f7",
  "#82d0fa",
  "#83d1ce",
  "#b263ea",
  "#5f5fde",
  "#FF9F45",
  "#eb4b63",
  "#22c55e",
  "#eab308",
  "#a855f7",
];
const MAX_LEGEND_LABEL_LENGTH = 18;

function truncateLegendLabel(label: string): string {
  if (label.length <= MAX_LEGEND_LABEL_LENGTH) return label;
  return `${label.slice(0, MAX_LEGEND_LABEL_LENGTH - 1)}…`;
}

interface AccountHoldingsDonutCardProps {
  holdings: AccountWithValue[];
  className?: string;
}

export function AccountHoldingsDonutCard({ holdings, className }: AccountHoldingsDonutCardProps) {
  const { data: rates } = useRates();
  const { data: user } = useUser();
  const userCurrency = user?.currency ?? "EUR";

  const data = useMemo(() => {
    return holdings
      .map((child) => {
        const value = convertToUserCurrency(child.value, child.currency, rates, userCurrency);
        return {
          name: child.name,
          value: Math.abs(Number(value)),
        };
      })
      .filter((d) => d.value > 0)
      .toSorted((a, b) => b.value - a.value)
      .map((item, index) => ({
        ...item,
        color: CHART_COLORS[index % CHART_COLORS.length],
      }));
  }, [holdings, rates, userCurrency]);

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    for (const item of data) {
      config[item.name] = { label: item.name, color: item.color };
    }
    return config;
  }, [data]);
  const totalValue = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data]);

  if (data.length === 0) {
    return (
      <Card className={cn("flex h-full flex-col", className)}>
        <CardHeader className="flex flex-col p-6">
          <CardTitle className="text-lg font-normal">Spread</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">No holdings</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("flex h-full flex-col", className)}>
      <CardHeader className="flex flex-col p-6">
        <CardTitle className="text-lg font-normal">Spread</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <ChartContainer config={chartConfig} className="min-h-[216px] w-full flex-1">
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  hideLabel
                  hideIndicator
                  className="min-w-[220px] rounded-xl border-border/60 bg-background/95 p-3 shadow-2xl backdrop-blur"
                  formatter={(value, name) => {
                    const numericValue = Number(value);
                    const share = totalValue > 0 ? (numericValue / totalValue) * 100 : 0;
                    const formattedValue = numericValue.toLocaleString(undefined, {
                      style: "currency",
                      currency: userCurrency,
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    });

                    return (
                      <div className="flex w-full items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            Asset
                          </p>
                          <p className="truncate text-sm font-medium text-foreground">
                            {String(name)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-sm font-semibold tabular-nums text-foreground">
                            {formattedValue}
                          </p>
                          <p className="text-xs text-muted-foreground">{share.toFixed(1)}%</p>
                        </div>
                      </div>
                    );
                  }}
                />
              }
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              startAngle={90}
              endAngle={450}
              innerRadius={60}
              outerRadius={80}
              strokeWidth={0}
              paddingAngle={2}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} fillOpacity={0.9} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
          {data.map((entry) => (
            <div key={entry.name} className="flex items-center gap-1.5 text-xs">
              <div
                className="h-2 w-2 shrink-0 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground" title={entry.name}>
                {truncateLegendLabel(entry.name)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
