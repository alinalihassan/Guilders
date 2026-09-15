import type { Merchant, Transaction } from "@guilders/api/types";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useLayoutEffect, useRef, useState } from "react";

import { isDateOnlyTimestamp } from "@/lib/format-time";
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

function dayKey(timestamp: string | Date): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  if (isDateOnlyTimestamp(date)) return date.toISOString().split("T")[0] ?? "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatGroupLabel(timestamp: string | Date): string {
  const date = new Date(timestamp);
  const options: Intl.DateTimeFormatOptions = isDateOnlyTimestamp(date)
    ? { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }
    : { weekday: "short", day: "numeric", month: "short" };
  const weekday = date.toLocaleDateString("en-GB", {
    weekday: options.weekday,
    timeZone: options.timeZone,
  });
  const day = date.toLocaleDateString("en-GB", { day: options.day, timeZone: options.timeZone });
  const month = date.toLocaleDateString("en-GB", {
    month: options.month,
    timeZone: options.timeZone,
  });
  return `${weekday}, ${day} ${month}`.toUpperCase();
}

type ListRow =
  | { type: "header"; key: string; label: string }
  | { type: "transaction"; transaction: Transaction };

function buildRows(transactions: Transaction[]): ListRow[] {
  const rows: ListRow[] = [];
  let lastKey = "";

  for (const transaction of transactions) {
    const key = dayKey(transaction.timestamp);
    if (key && key !== lastKey) {
      rows.push({ type: "header", key, label: formatGroupLabel(transaction.timestamp) });
      lastKey = key;
    }
    rows.push({ type: "transaction", transaction });
  }

  return rows;
}

function TransactionRow({
  transaction,
  merchantsById,
  accountsById,
  variant,
}: {
  transaction: Transaction;
  merchantsById: Map<number, Merchant>;
  accountsById?: Map<number, string>;
  variant: "default" | "ledger";
}) {
  return (
    <TransactionItem
      transaction={transaction}
      merchant={
        transaction.merchant_id != null ? merchantsById.get(transaction.merchant_id) : undefined
      }
      accountName={
        transaction.account_id != null ? accountsById?.get(transaction.account_id) : undefined
      }
      variant={variant}
    />
  );
}

function LedgerList({
  transactions,
  merchantsById,
  accountsById,
  className,
}: {
  transactions: Transaction[];
  merchantsById: Map<number, Merchant>;
  accountsById?: Map<number, string>;
  className?: string;
}) {
  const rows = buildRows(transactions);

  return (
    <div className={cn("flex w-full flex-col", className)}>
      {rows.map((row) =>
        row.type === "header" ? (
          <p
            key={`header-${row.key}`}
            className="text-muted-foreground pt-3 pb-1 text-[11px] font-medium tracking-[0.16em] uppercase"
          >
            {row.label}
          </p>
        ) : (
          <TransactionRow
            key={row.transaction.id}
            transaction={row.transaction}
            merchantsById={merchantsById}
            accountsById={accountsById}
            variant="ledger"
          />
        ),
      )}
    </div>
  );
}

function VirtualizedList({
  transactions,
  merchantsById,
  accountsById,
  className,
  scroll,
  variant,
}: {
  transactions: Transaction[];
  merchantsById: Map<number, Merchant>;
  accountsById?: Map<number, string>;
  className?: string;
  scroll: "local" | "page";
  variant: "default" | "ledger";
}) {
  const { scrollElement } = useMainScroll();
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  const usePageScroll = scroll === "page" && scrollElement != null;
  const rows = variant === "ledger" ? buildRows(transactions) : null;
  const itemCount = rows?.length ?? transactions.length;

  useLayoutEffect(() => {
    if (!usePageScroll || !listRef.current || !scrollElement) {
      setScrollMargin(0);
      return;
    }
    setScrollMargin(offsetWithinScrollParent(listRef.current, scrollElement));
  }, [usePageScroll, scrollElement, itemCount]);

  const virtualizer = useVirtualizer({
    count: itemCount,
    getScrollElement: () => (usePageScroll ? scrollElement : listRef.current),
    estimateSize: (index) => {
      if (rows?.[index]?.type === "header") return 36;
      return variant === "ledger" ? 56 : 52;
    },
    getItemKey: (index) => {
      if (rows) {
        const row = rows[index];
        if (!row) return index;
        return row.type === "header" ? `header-${row.key}` : `tx-${row.transaction.id}`;
      }
      const transaction = transactions[index];
      return transaction ? `tx-${transaction.id}` : index;
    },
    overscan: 12,
    gap: 4,
    scrollMargin: usePageScroll ? scrollMargin : 0,
  });

  return (
    <div ref={listRef} className={cn(usePageScroll ? "w-full" : "overflow-auto", className)}>
      <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const row = rows
            ? rows[virtualItem.index]
            : ({
                type: "transaction" as const,
                transaction: transactions[virtualItem.index]!,
              } satisfies ListRow);
          if (!row) return null;

          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              className="absolute top-0 left-0 w-full"
              style={{
                transform: `translateY(${virtualItem.start - (usePageScroll ? scrollMargin : 0)}px)`,
              }}
            >
              {row.type === "header" ? (
                <p className="text-muted-foreground pt-3 pb-1 text-[11px] font-medium tracking-[0.16em] uppercase">
                  {row.label}
                </p>
              ) : (
                <TransactionRow
                  transaction={row.transaction}
                  merchantsById={merchantsById}
                  accountsById={accountsById}
                  variant={variant}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TransactionsVirtualList({
  transactions,
  merchantsById,
  accountsById,
  className,
  scroll = "local",
  variant = "default",
}: {
  transactions: Transaction[];
  merchantsById: Map<number, Merchant>;
  accountsById?: Map<number, string>;
  className?: string;
  scroll?: "local" | "page";
  variant?: "default" | "ledger";
}) {
  // Page ledger uses normal flow so row spacing comes from content, not size estimates.
  if (scroll === "page" && variant === "ledger") {
    return (
      <LedgerList
        transactions={transactions}
        merchantsById={merchantsById}
        accountsById={accountsById}
        className={className}
      />
    );
  }

  return (
    <VirtualizedList
      transactions={transactions}
      merchantsById={merchantsById}
      accountsById={accountsById}
      className={className}
      scroll={scroll}
      variant={variant}
    />
  );
}
