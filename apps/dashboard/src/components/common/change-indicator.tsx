import NumberFlow from "@number-flow/react";

interface ChangeIndicatorProps {
  change: {
    value: number;
    percentage: number;
    currency: string;
  };
  invertColors?: boolean;
}

export function ChangeIndicator({
  change,
  invertColors = false,
}: ChangeIndicatorProps) {
  const isPositive = change.value >= 0;
  const absValue = Math.abs(change.value);
  const absPercentage = Math.abs(change.percentage);

  if (change.value === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No change vs last month
      </div>
    );
  }

  const getColorClass = () => {
    const isPositiveColor = invertColors ? !isPositive : isPositive;
    return isPositiveColor
      ? "text-green-600 dark:text-green-400"
      : "text-red-600 dark:text-red-400";
  };

  return (
    <div className={`text-sm ${getColorClass()}`}>
      {isPositive ? "+" : "-"}{" "}
      <NumberFlow
        value={absValue}
        format={{
          style: "currency",
          currency: change.currency,
        }}
      />
      {" ("}
      <NumberFlow
        value={absPercentage}
        format={{
          style: "percent",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }}
      />
      {") vs last month"}
    </div>
  );
}
