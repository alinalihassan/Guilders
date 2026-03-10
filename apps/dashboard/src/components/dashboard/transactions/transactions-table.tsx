import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useMerchants } from "@/lib/queries/useMerchants";
import { useTransactions } from "@/lib/queries/useTransactions";

import { TransactionItem } from "./transaction-item";
import { TransactionsEmptyPlaceholder } from "./transactions-placeholder";

const ROW_HEIGHT = 64;

export function TransactionsTable({ accountId }: { accountId?: number }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const { data: transactions, isLoading, error } = useTransactions(accountId);
  const { data: merchants } = useMerchants();
  const merchantsById = useMemo(() => new Map(merchants?.map((m) => [m.id, m]) ?? []), [merchants]);

  const sortedTransactions = useMemo(
    () =>
      transactions
        ? [...transactions].toSorted(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
          )
        : [],
    [transactions],
  );

  const virtualizer = useVirtualizer({
    count: sortedTransactions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="h-full min-h-0 flex-1 overflow-auto">
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, index) => (
            <Skeleton key={index} className="mb-2 h-10 w-full" />
          ))}
        </div>
      ) : error || !transactions ? (
        <div className="py-8 text-center">
          <p className="mb-4">Error loading transactions. Please try again later.</p>
        </div>
      ) : sortedTransactions.length === 0 ? (
        <TransactionsEmptyPlaceholder accountId={accountId} />
      ) : (
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const transaction = sortedTransactions[virtualRow.index];
            if (!transaction) return null;
            return (
              <div
                key={transaction.id}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <TransactionItem
                  transaction={transaction}
                  merchant={
                    transaction.merchant_id != null
                      ? merchantsById.get(transaction.merchant_id)
                      : undefined
                  }
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
