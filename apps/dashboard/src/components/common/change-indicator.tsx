import NumberFlow from "@/components/ui/number-flow";

interface ChangeIndicatorProps {
  change: {
    value: number;
    percentage: number;
    currency: string;
  };
  invertColors?: boolean;
  periodLabel?: string;
  variant?: "plain" | "pill";
}

export function ChangeIndicator({
  change,
  invertColors = false,
  periodLabel,
  variant = "plain",
}: ChangeIndicatorProps) {
  const isPositive = change.value >= 0;
  const absValue = Math.abs(change.value);
  const absPercentage = Math.abs(change.percentage);
  const isPositiveColor = invertColors ? !isPositive : isPositive;

  if (change.value === 0) {
    return (
      <div
        className={
          variant === "pill"
            ? "bg-muted text-muted-foreground w-fit rounded-full px-2.5 py-1 text-xs"
            : "text-muted-foreground text-sm"
        }
      >
        No change{periodLabel ? ` ${periodLabel}` : ""}
      </div>
    );
  }

  const arrow = isPositive ? "\u2191" : "\u2193";
  const colorClass = isPositiveColor
    ? "text-emerald-700 dark:text-emerald-400"
    : "text-red-600 dark:text-red-400";
  const pillClass = isPositiveColor
    ? "bg-emerald-50 dark:bg-emerald-950/40"
    : "bg-red-50 dark:bg-red-950/40";

  const body = (
    <>
      {arrow} {isPositive ? "+" : "\u2212"}
      <NumberFlow
        value={absValue}
        format={{
          style: "currency",
          currency: change.currency,
        }}
      />
      {variant === "plain" && (
        <>
          {" "}
          (
          <NumberFlow
            value={absPercentage}
            format={{
              style: "percent",
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            }}
          />
          )
        </>
      )}
      {periodLabel && (
        <span className={variant === "pill" ? "ml-1 opacity-80" : "text-muted-foreground"}>
          {" "}
          {periodLabel}
        </span>
      )}
    </>
  );

  if (variant === "pill") {
    return (
      <div
        className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${pillClass} ${colorClass}`}
      >
        {body}
      </div>
    );
  }

  return <div className={`text-sm ${colorClass}`}>{body}</div>;
}
