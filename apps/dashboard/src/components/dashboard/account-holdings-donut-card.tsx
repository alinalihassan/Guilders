import { useMemo } from "react";
import { Cell, Pie, PieChart } from "recharts";

import { Card, CardContent } from "@/components/ui/card";
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
      <Card className={cn("flex h-full flex-col shadow-none", className)}>
        <CardContent className="flex h-full flex-col gap-5 p-6">
          <p className="text-muted-foreground text-[11px] font-medium tracking-[0.16em] uppercase">
            Spread
          </p>
          <div className="flex flex-1 items-center justify-center">
            <p className="text-muted-foreground text-sm">No holdings</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("flex h-full flex-col shadow-none", className)}>
      <CardContent className="flex h-full flex-col gap-5 p-6">
        <p className="text-muted-foreground text-[11px] font-medium tracking-[0.16em] uppercase">
          Spread
        </p>
        <ChartContainer config={chartConfig} className="min-h-[216px] w-full flex-1">
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  hideLabel
                  hideIndicator
                  className="border-border/60 bg-background/95 min-w-[220px] rounded-xl p-3 shadow-2xl backdrop-blur"
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
                          <p className="text-muted-foreground text-[11px] tracking-wide uppercase">
                            Asset
                          </p>
                          <p className="text-foreground truncate text-sm font-medium">
                            {String(name)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-foreground font-mono text-sm font-semibold tabular-nums">
                            {formattedValue}
                          </p>
                          <p className="text-muted-foreground text-xs">{share.toFixed(1)}%</p>
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
        <ul className="flex flex-col gap-2">
          {data.slice(0, 6).map((entry) => {
            const share = totalValue === 0 ? 0 : entry.value / totalValue;
            return (
              <li key={entry.name} className="flex items-center gap-3 text-sm">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-muted-foreground min-w-0 truncate" title={entry.name}>
                  {truncateLegendLabel(entry.name)}
                </span>
                <span className="text-muted-foreground ml-auto w-10 text-right font-mono text-xs tabular-nums">
                  {(share * 100).toFixed(0)}%
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
