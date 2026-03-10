import type { Merchant, Transaction } from "@guilders/api/types";

import { CategoryBadge } from "@/components/common/category-badge";
import NumberFlow from "@/components/ui/number-flow";
import { useDialog } from "@/hooks/useDialog";
import { useFormattedTime } from "@/lib/format-time";
import { useCategories } from "@/lib/queries/useCategories";
import { buildCategoryLookup } from "@/lib/utils/category-tree";

interface TransactionItemProps {
  transaction: Transaction;
  merchant?: Merchant | null;
}

export function TransactionItem({ transaction, merchant }: TransactionItemProps) {
  const { open } = useDialog("editTransaction");
  const { data: flatCategories } = useCategories();
  const categoryLookup = buildCategoryLookup(flatCategories ?? []);
  const category =
    transaction.category_id != null ? categoryLookup.get(transaction.category_id) : undefined;
  const amount = Number(transaction.amount);
  const timeStr = useFormattedTime(new Date(transaction.timestamp));

  const rawMerchantName = merchant?.name?.trim() ?? "";
  const rawDescription = transaction.description?.trim() ?? "";
  const displayName = rawMerchantName || rawDescription || "Unknown Transaction";
  const initial = displayName.charAt(0).toUpperCase();
  const secondaryName =
    displayName === rawMerchantName ? rawDescription || undefined : rawMerchantName || undefined;

  return (
    <div
      className="flex cursor-pointer items-center justify-between rounded-lg p-2 hover:bg-secondary"
      onClick={() => open({ transaction })}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="shrink-0">
          {merchant?.logo_url ? (
            <img
              src={merchant.logo_url}
              alt={merchant.name}
              className="flex size-8 items-center justify-center rounded-full border bg-muted object-cover"
            />
          ) : (
            <div className="flex size-8 items-center justify-center rounded-full border bg-muted font-medium text-muted-foreground">
              {initial}
            </div>
          )}
        </div>
        <div className="flex flex-col overflow-hidden">
          <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
          {secondaryName && secondaryName !== displayName && (
            <p className="truncate text-xs text-muted-foreground">{secondaryName}</p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 pl-4">
        {category && <CategoryBadge category={category} />}
        <div className="flex flex-col items-end">
          <p
            className={`font-mono font-medium ${
              amount > 0
                ? "text-green-600 dark:text-green-400"
                : amount < 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-gray-900 dark:text-white"
            }`}
          >
            <NumberFlow
              value={Math.abs(amount)}
              format={{
                style: "currency",
                currency: transaction.currency,
              }}
            />
          </p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>{new Date(transaction.timestamp).toLocaleDateString()}</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">{timeStr}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
