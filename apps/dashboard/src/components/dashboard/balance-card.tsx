"use client";

import NumberFlow from "@number-flow/react";
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

interface BalanceCardProps {
  title: string;
  value: number;
  currency: string;
  change: {
    value: number;
    percentage: number;
    currency: string;
  };
  className?: string;
}

// Mock data for the chart (can be replaced with real data later)
const chartData = [
  { month: "January", value: 100 },
  { month: "February", value: 120 },
  { month: "March", value: 150 },
  { month: "April", value: 300 },
  { month: "May", value: 280 },
  { month: "June", value: 350 },
  { month: "July", value: 380 },
  { month: "August", value: 390 },
  { month: "September", value: 410 },
  { month: "October", value: 450 },
  { month: "November", value: 500 },
  { month: "December", value: 520 },
];

const chartConfig = {
  value: {
    label: "Value",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

type TimeRange = "1D" | "1W" | "1M" | "1Y";

export function BalanceCard({ title, value, currency, change, className }: BalanceCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-col p-6">
        <div className="flex flex-row justify-between items-center">
          <CardTitle className="text-lg font-normal">{title}</CardTitle>
          <Select defaultValue="1M">
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1D">1 Day</SelectItem>
              <SelectItem value="1W">1 Week</SelectItem>
              <SelectItem value="1M">1 Month</SelectItem>
              <SelectItem value="1Y">1 Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col">
          <NumberFlow
            value={value}
            format={{
              style: "currency",
              currency: currency,
            }}
            className="text-4xl font-normal font-mono tracking-tight -mt-2.5 -mb-0.5"
          />
          <ChangeIndicator change={change} />
        </div>
      </CardHeader>
      <CardContent>
        {/* @ts-ignore */}
        <ChartContainer className="max-h-[216px] w-full relative" config={chartConfig}>
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <p className="text-muted-foreground text-sm">Historical data not supported yet</p>
          </div>

          <AreaChart data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value: string) => value.slice(0, 3)}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
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
