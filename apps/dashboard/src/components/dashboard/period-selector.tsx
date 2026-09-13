import { PERIODS, type Period } from "@/lib/queries/useBalanceHistory";
import { cn } from "@/lib/utils";

export function PeriodSelector({
  value,
  onChange,
}: {
  value: Period;
  onChange: (period: Period) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Time range"
      className="bg-muted/70 flex items-center rounded-full p-0.5"
    >
      {PERIODS.map((period) => {
        const selected = period === value;
        return (
          <button
            key={period}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(period)}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide transition-colors",
              selected
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {period}
          </button>
        );
      })}
    </div>
  );
}
