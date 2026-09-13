import type { Merchant, Transaction } from "@guilders/api/types";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useLayoutEffect, useRef, useState } from "react";

import { useMainScroll } from "@/lib/scroll-context";
import { cn } from "@/lib/utils";

import { TransactionItem } from "./transaction-item";

function offsetWithinScrollParent(element: HTMLElement, scrollParent: HTMLElement) {
  return (
    element.getBoundingClientRect().top -
    scrollParent.getBoundingClientRect().top +
    scrollParent.scrollTop
  );
}

export function TransactionsVirtualList({
  transactions,
  merchantsById,
  className,
  scroll = "local",
}: {
  transactions: Transaction[];
  merchantsById: Map<number, Merchant>;
  className?: string;
  scroll?: "local" | "page";
}) {
  const { scrollElement } = useMainScroll();
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  const usePageScroll = scroll === "page" && scrollElement != null;

  useLayoutEffect(() => {
    if (!usePageScroll || !listRef.current || !scrollElement) {
      setScrollMargin(0);
      return;
    }
    setScrollMargin(offsetWithinScrollParent(listRef.current, scrollElement));
  }, [usePageScroll, scrollElement, transactions.length]);

  const virtualizer = useVirtualizer({
    count: transactions.length,
    getScrollElement: () => (usePageScroll ? scrollElement : listRef.current),
    estimateSize: () => 64,
    overscan: 12,
    gap: 8,
    scrollMargin: usePageScroll ? scrollMargin : 0,
  });

  return (
    <div ref={listRef} className={cn(usePageScroll ? "w-full" : "overflow-auto", className)}>
      <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const transaction = transactions[virtualItem.index];
          if (!transaction) return null;

          return (
            <div
              key={transaction.id}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              className="absolute top-0 left-0 w-full"
              style={{
                transform: `translateY(${virtualItem.start - (usePageScroll ? scrollMargin : 0)}px)`,
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
