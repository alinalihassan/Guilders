import type { Merchant, Transaction } from "@guilders/api/types";

import { CategoryBadge } from "@/components/common/category-badge";
import { MerchantLogo } from "@/components/common/merchant-logo";
import NumberFlow from "@/components/ui/number-flow";
import { useDialog } from "@/hooks/useDialog";
import { formatTransactionDate, isDateOnlyTimestamp, useFormattedTime } from "@/lib/format-time";
import { useCategories } from "@/lib/queries/useCategories";
import { cn } from "@/lib/utils";
import { buildCategoryLookup } from "@/lib/utils/category-tree";

interface TransactionItemProps {
  transaction: Transaction;
  merchant?: Merchant | null;
  accountName?: string;
  variant?: "default" | "ledger";
}

export function TransactionItem({
  transaction,
  merchant,
  accountName,
  variant = "default",
}: TransactionItemProps) {
  const { open } = useDialog("editTransaction");
  const { data: flatCategories } = useCategories();
  const categoryLookup = buildCategoryLookup(flatCategories ?? []);
  const category =
    transaction.category_id != null ? categoryLookup.get(transaction.category_id) : undefined;
  const amount = Number(transaction.amount);
  const timestamp = new Date(transaction.timestamp);
  const dateOnly = isDateOnlyTimestamp(timestamp);
  const timeStr = useFormattedTime(timestamp);

  const rawMerchantName = merchant?.name?.trim() ?? "";
  const rawDescription = transaction.description?.trim() ?? "";
  const displayName = rawMerchantName || rawDescription || "Unknown Transaction";
  const secondaryName =
    variant === "ledger"
      ? accountName
      : displayName === rawMerchantName
        ? rawDescription || undefined
        : rawMerchantName || undefined;

  return (
    <button
      type="button"
      className="hover:bg-muted/60 flex w-full items-center justify-between rounded-lg px-1 py-2 text-left"
      onClick={() => open({ transaction })}
    >
      <div className="flex min-w-0 items-center gap-3 overflow-hidden">
        <MerchantLogo
          name={displayName}
          logoUrl={merchant?.logo_url}
          className={variant === "ledger" ? "size-10 text-sm" : "size-9 text-sm"}
        />
        <div className="flex min-w-0 items-center gap-2 overflow-hidden">
          <div className="flex min-w-0 flex-col overflow-hidden">
            <p className="text-foreground truncate text-sm font-medium">{displayName}</p>
            {secondaryName && secondaryName !== displayName && (
              <p className="text-muted-foreground truncate text-xs">{secondaryName}</p>
            )}
          </div>
          {transaction.tags && transaction.tags.length > 0 && (
            <div className="flex shrink-0 flex-wrap gap-1">
              {transaction.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="bg-muted text-muted-foreground inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2.5 pl-3">
        {category && (
          <CategoryBadge
            category={category}
            className={
              variant === "ledger" ? "hidden sm:inline-flex" : "hidden @[28rem]:inline-flex"
            }
          />
        )}
        <div className="flex flex-col items-end">
          <NumberFlow
            value={Math.abs(amount)}
            format={{
              style: "currency",
              currency: transaction.currency,
            }}
            className={cn(
              "font-mono text-sm tabular-nums",
              amount > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : amount < 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-foreground",
            )}
          />
          {variant !== "ledger" && (
            <div className="text-muted-foreground flex items-center gap-1 text-xs">
              <span>{formatTransactionDate(timestamp)}</span>
              {!dateOnly && (
                <>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline">{timeStr}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
