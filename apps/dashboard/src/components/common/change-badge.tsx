import NumberFlow from "@number-flow/react";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";

export function ChangeBadge({
  change,
  showAbsoluteChange = false,
}: {
  change: { value: number; percentage: number; currency: string };
  showAbsoluteChange?: boolean;
}) {
  const isPositive = change.value > 0;
  const isZero = change.value === 0;
  const absValue = Math.abs(change.value);
  const absPercentage = Math.abs(Number.isFinite(change.percentage) ? change.percentage : 0);

  const colorClass = isZero
    ? "bg-muted text-muted-foreground"
    : isPositive
      ? "bg-green-500/10 text-green-700 dark:text-green-400"
      : "bg-red-500/10 text-red-700 dark:text-red-400";

  const Icon = isZero ? Minus : isPositive ? TrendingUp : TrendingDown;

  return (
    <span
      className={`ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1 font-mono text-xs ${colorClass}`}
    >
      <Icon size={12} strokeWidth={2.5} />
      {showAbsoluteChange && (
        <>
          <NumberFlow
            value={absValue}
            format={{ style: "currency", currency: change.currency }}
          />
          <span className="text-muted-foreground">/</span>
        </>
      )}
      <NumberFlow
        value={absPercentage / 100}
        format={{ style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }}
      />
    </span>
  );
}
