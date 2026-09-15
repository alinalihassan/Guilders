import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface TransactionStatsProps {
  count: number;
  income: number;
  expenses: number;
  currency: string;
  isLoading: boolean;
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(value);
}

export function TransactionStats({
  count,
  income,
  expenses,
  currency,
  isLoading,
}: TransactionStatsProps) {
  const net = income - expenses;
  const netTone =
    net > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : net < 0
        ? "text-red-600 dark:text-red-400"
        : "text-foreground";

  return (
    <div className="flex flex-col items-center gap-4 py-1">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <p className="text-muted-foreground text-[11px] font-medium tracking-[0.16em] uppercase">
          Net
        </p>
        {isLoading ? (
          <Skeleton className="h-9 w-40" />
        ) : (
          <p
            className={cn(
              "font-mono text-[2rem] leading-none tracking-tight tabular-nums",
              netTone,
            )}
          >
            {formatMoney(net, currency)}
          </p>
        )}
        {isLoading ? (
          <Skeleton className="mt-1 h-4 w-28" />
        ) : (
          <p className="text-muted-foreground text-sm">
            {count.toLocaleString()} transaction{count === 1 ? "" : "s"}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-36 rounded-full" />
            <Skeleton className="h-8 w-36 rounded-full" />
          </>
        ) : (
          <>
            <span className="rounded-full bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-400">
              Expenses{" "}
              <span className="font-mono tabular-nums">
                {formatMoney(-Math.abs(expenses), currency)}
              </span>
            </span>
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              Income <span className="font-mono tabular-nums">{formatMoney(income, currency)}</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
}
