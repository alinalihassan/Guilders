"use client";

import { useCallback, useId, useMemo, useState } from "react";
import { Area, AreaChart, Tooltip, XAxis, YAxis } from "recharts";

import { type ChartConfig, ChartContainer } from "@/components/ui/chart";

export interface BalanceChartData {
  date: string;
  value: number;
}

interface BalanceChartProps {
  data: BalanceChartData[];
  hasData: boolean;
  trendColor: string;
  /** Current balance, used to draw a flat line when there's no historical data */
  currentValue?: number;
  variant?: "full" | "sparkline";
  currency?: string;
  firstValue?: number;
  className?: string;
}

function parseDate(raw: unknown): Date {
  if (raw instanceof Date) return raw;
  const str = String(raw);
  // YYYY-MM-DD → append time to avoid UTC-shift issues
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return new Date(str + "T12:00:00");
  return new Date(str);
}

function formatDateLabel(raw: string): string {
  const date = parseDate(raw);
  if (Number.isNaN(date.getTime())) return String(raw);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(amount: number, currency: string): string {
  return amount.toLocaleString(undefined, { style: "currency", currency });
}

function PointTooltip({
  active,
  payload,
  currency,
  trendColor,
  firstValue,
}: {
  active?: boolean;
  // oxlint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[];
  currency: string;
  trendColor: string;
  firstValue: number;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as BalanceChartData | undefined;
  if (!point) return null;

  const diff = point.value - firstValue;
  const pct = firstValue !== 0 ? Math.abs(diff / firstValue) : 0;
  const arrow = diff > 0 ? "\u2191" : diff < 0 ? "\u2193" : "";

  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-md">
      <div className="mb-1 text-xs text-muted-foreground">{formatDateLabel(point.date)}</div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full border-2"
            style={{ borderColor: trendColor, backgroundColor: "transparent" }}
          />
          <span className="font-mono font-medium">{formatCurrency(point.value, currency)}</span>
        </div>
        {diff !== 0 && (
          <span className="font-mono text-xs" style={{ color: trendColor }}>
            {diff > 0 ? "+" : ""}
            {formatCurrency(diff, currency)} ({arrow}
            {(pct * 100).toFixed(1)}%)
          </span>
        )}
      </div>
    </div>
  );
}

function computeYDomain(data: BalanceChartData[]): [number, number] {
  if (data.length === 0) return [0, 1];
  if (data.length === 1) {
    const v = data[0]!.value;
    const pad = v === 0 ? 1 : Math.abs(v) * 0.1;
    return [v - pad, v + pad];
  }

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (min === max) {
    const padding = max === 0 ? 100 : Math.abs(max) * 0.1;
    return [min - padding, max + padding];
  }

  const range = max - min;
  const avg = (max + min) / 2;
  const relativeChange = avg !== 0 ? range / Math.abs(avg) : 1;

  if (relativeChange < 0.1 && min > 0) {
    const basePad = range * 2;
    return [Math.max(0, min - basePad), max + range * 0.5];
  }

  const yMin =
    min < 0 || (min >= 0 && min < avg * 0.1) ? Math.min(0, min * 1.1) : min - range * 0.3;
  return [yMin, max + range * 0.1];
}

const FLAT_LINE_COLOR = "var(--color-green-500, #22c55e)";

function generateFlatLineData(value: number, days: number): BalanceChartData[] {
  const now = new Date();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (days - 1 - i));
    return { date: d.toISOString().split("T")[0]!, value };
  });
}

export function BalanceChart({
  data,
  hasData,
  trendColor,
  currentValue,
  variant = "full",
  currency = "EUR",
  firstValue = 0,
  className,
}: BalanceChartProps) {
  const chartId = useId().replace(/:/g, "");

  const effectiveColor = hasData ? trendColor : FLAT_LINE_COLOR;
  const flatLineData = useMemo(
    () => generateFlatLineData(currentValue ?? 0, variant === "full" ? 30 : 7),
    [currentValue, variant],
  );

  const dataWithCurrent = useMemo(() => {
    if (!hasData) return flatLineData;
    if (currentValue == null) return data;
    const today = new Date().toISOString().split("T")[0]!;
    const lastDate = data[data.length - 1]?.date;
    if (lastDate === today) return data;
    return [...data, { date: today, value: currentValue }];
  }, [hasData, data, flatLineData, currentValue]);

  const effectiveData = dataWithCurrent;

  const chartConfig = useMemo(
    () =>
      ({
        value: { label: "Value", color: effectiveColor },
      }) satisfies ChartConfig,
    [effectiveColor],
  );

  const yDomain = useMemo(() => computeYDomain(effectiveData), [effectiveData]);

  const xTicks = useMemo(() => {
    if (effectiveData.length >= 2) {
      return [effectiveData[0]!.date, effectiveData[effectiveData.length - 1]!.date];
    }
    return undefined;
  }, [effectiveData]);

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const isHovering = activeIndex !== null;
  const hoverOffset =
    activeIndex !== null && effectiveData.length > 1
      ? activeIndex / (effectiveData.length - 1)
      : 1;

  const renderTooltip = useCallback(
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    (props: any) => (
      <PointTooltip
        {...props}
        currency={currency}
        trendColor={effectiveColor}
        firstValue={firstValue}
      />
    ),
    [currency, effectiveColor, firstValue],
  );

  if (variant === "sparkline") {
    return (
      // @ts-ignore
      <ChartContainer className={className ?? "h-[80px]"} config={chartConfig}>
        <AreaChart data={effectiveData}>
          <defs>
            <linearGradient id={`sparkgrad-${chartId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-value)" stopOpacity={0.12} />
              <stop offset="100%" stopColor="var(--color-value)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={yDomain} hide />
          <Area
            dataKey="value"
            type="monotone"
            fill={hasData ? `url(#sparkgrad-${chartId})` : "transparent"}
            stroke="var(--color-value)"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ChartContainer>
    );
  }

  const mutedLineColor = "#d1d5db";

  return (
    // @ts-ignore
    <ChartContainer className={className ?? "max-h-[216px] w-full"} config={chartConfig}>
      <AreaChart
        data={effectiveData}
        margin={{ top: 8, right: 12, bottom: 0, left: 12 }}
        onMouseMove={(state) => {
          if (state?.activeTooltipIndex != null) setActiveIndex(state.activeTooltipIndex);
        }}
        onMouseLeave={() => setActiveIndex(null)}
      >
        <defs>
          {/* Vertical fill gradient */}
          <linearGradient id={`fill-${chartId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-value)" stopOpacity={0.12} />
            <stop offset="40%" stopColor="var(--color-value)" stopOpacity={0} />
          </linearGradient>
          {/* Hover stroke — trend color left, muted gray right */}
          <linearGradient id={`stroke-split-${chartId}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset={hoverOffset} stopColor="var(--color-value)" />
            <stop offset={hoverOffset} stopColor={mutedLineColor} />
          </linearGradient>
          {/* Clip the fill to only show left of the hover point */}
          <clipPath id={`clip-left-${chartId}`} clipPathUnits="objectBoundingBox">
            <rect x="0" y="0" width={hoverOffset} height="1" />
          </clipPath>
        </defs>
        <YAxis domain={yDomain} hide />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          ticks={xTicks}
          tickFormatter={formatDateLabel}
          style={{ fontSize: 12, fontWeight: 500 }}
          stroke="var(--muted-foreground)"
        />
        {hasData && (
          <Tooltip
            content={renderTooltip}
            cursor={{
              stroke: "var(--muted-foreground)",
              strokeDasharray: "4 4",
              strokeWidth: 1,
            }}
            isAnimationActive={false}
          />
        )}
        {/* Clipped fill area — shows green gradient only left of hover point */}
        {hasData && isHovering && (
          <Area
            dataKey="value"
            type="monotone"
            fill={`url(#fill-${chartId})`}
            stroke="none"
            strokeWidth={0}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
            clipPath={`url(#clip-left-${chartId})`}
          />
        )}
        <Area
          dataKey="value"
          type="monotone"
          fill={hasData && !isHovering ? `url(#fill-${chartId})` : "transparent"}
          stroke={
            isHovering ? `url(#stroke-split-${chartId})` : "var(--color-value)"
          }
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          dot={false}
          activeDot={
            hasData
              ? {
                  r: 3.5,
                  fill: effectiveColor,
                  stroke: "var(--background)",
                  strokeWidth: 1.5,
                }
              : false
          }
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}
