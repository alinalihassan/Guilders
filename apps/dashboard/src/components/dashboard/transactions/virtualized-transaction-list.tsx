import type { Merchant, Transaction } from "@guilders/api/types";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import { TransactionItem } from "./transaction-item";
import { TransactionsEmptyPlaceholder } from "./transactions-placeholder";

const ROW_HEIGHT = 64;

interface VirtualizedTransactionListProps {
  transactions: Transaction[];
  isLoading: boolean;
  searchQuery: string;
  merchantsById: Map<number, Merchant>;
  accountId?: number;
  /** Optional class for the scroll container (e.g. max-h-[60vh] for page layout) */
  className?: string;
}

export function VirtualizedTransactionList({
  transactions,
  isLoading,
  searchQuery,
  merchantsById,
  accountId,
  className,
}: VirtualizedTransactionListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: transactions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    if (searchQuery) {
      return (
        <div className="py-8 text-center text-muted-foreground">
          No transactions found matching "{searchQuery}"
        </div>
      );
    }
    return <TransactionsEmptyPlaceholder accountId={accountId} />;
  }

  return (
    <div
      ref={parentRef}
      className={className}
      style={{
        height: "60vh",
        minHeight: 300,
        overflow: "auto",
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const transaction = transactions[virtualRow.index];
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
    </div>
  );
}
