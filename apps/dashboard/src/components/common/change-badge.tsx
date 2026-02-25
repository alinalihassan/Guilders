import NumberFlow from "@number-flow/react";
import { ChevronDown, ChevronUp } from "lucide-react";

export function ChangeBadge({
  change,
  showAbsoluteChange = false,
}: {
  change: { value: number; percentage: number; currency: string };
  showAbsoluteChange?: boolean;
}) {
  const isPositive = change.value >= 0;
  const absValue = Math.abs(change.value);
  const absPercentage = Math.abs(Number.isFinite(change.percentage) ? change.percentage : 0);

  return (
    <span
      className={`text-xs ${showAbsoluteChange === false ? "w-[84px]" : ""} ${
        isPositive
          ? "bg-green-100 text-green-700 dark:bg-[#182f28] dark:text-[#2ff795]"
          : "bg-red-100 text-red-700 dark:bg-[#2d1e1e] dark:text-[#ff4d4d]"
      } ml-auto inline-flex items-center rounded-md p-2 font-mono`}
    >
      {isPositive ? (
        <ChevronUp className="mr-0.5" size={16} />
      ) : (
        <ChevronDown className="mr-0.5" size={16} />
      )}
      {showAbsoluteChange && (
        <>
          <NumberFlow
            value={absValue}
            format={{
              style: "currency",
              currency: change.currency,
            }}
          />
          {" ("}
        </>
      )}
      {absPercentage.toFixed(2)}%{showAbsoluteChange && ")"}
    </span>
  );
}
