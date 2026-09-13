import { cn } from "@/lib/utils";

export type TransactionKindFilter = "all" | "expense" | "income";

const OPTIONS: { id: TransactionKindFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "expense", label: "Expenses" },
  { id: "income", label: "Income" },
];

export function KindSelector({
  value,
  onChange,
}: {
  value: TransactionKindFilter;
  onChange: (value: TransactionKindFilter) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Transaction type"
      className="bg-muted/70 flex items-center rounded-full p-0.5"
    >
      {OPTIONS.map((option) => {
        const selected = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.id)}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide transition-colors",
              selected
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
