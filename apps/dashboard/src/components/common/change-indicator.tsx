import NumberFlow from "@number-flow/react";

interface ChangeIndicatorProps {
  change: {
    value: number;
    percentage: number;
    currency: string;
  };
  invertColors?: boolean;
  periodLabel?: string;
}

export function ChangeIndicator({
  change,
  invertColors = false,
  periodLabel,
}: ChangeIndicatorProps) {
  const isPositive = change.value >= 0;
  const absValue = Math.abs(change.value);
  const absPercentage = Math.abs(change.percentage);

  if (change.value === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No change{periodLabel ? ` vs ${periodLabel}` : ""}
      </div>
    );
  }

  const getColorClass = () => {
    const isPositiveColor = invertColors ? !isPositive : isPositive;
    return isPositiveColor
      ? "text-green-600 dark:text-green-400"
      : "text-red-600 dark:text-red-400";
  };

  const arrow = isPositive ? "\u2191" : "\u2193";

  return (
    <div className={`text-sm ${getColorClass()}`}>
      {isPositive ? "+" : "\u2212"}
      <NumberFlow
        value={absValue}
        format={{
          style: "currency",
          currency: change.currency,
        }}
      />{" "}
      ({arrow}
      <NumberFlow
        value={absPercentage}
        format={{
          style: "percent",
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        }}
      />
      )
      {periodLabel && <span className="text-muted-foreground"> vs {periodLabel}</span>}
    </div>
  );
}
