import type { Account } from "@guilders/api/types";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef } from "react";

import { AccountItem } from "@/components/dashboard/accounts/account-item";
import { AccountsEmptyPlaceholder } from "@/components/dashboard/accounts/accounts-placeholder";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccounts } from "@/lib/queries/useAccounts";

const ROW_HEIGHT = 64;

interface AccountsTableProps {
  accounts?: Account[];
  isLoading?: boolean;
}

export function AccountsTable({
  accounts: propAccounts,
  isLoading: propIsLoading,
}: AccountsTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const { data: hookAccounts, isLoading: hookIsLoading, error } = useAccounts();

  // Use prop values if provided, otherwise fall back to hook values
  const rawAccounts = propAccounts ?? hookAccounts;
  const accounts =
    propAccounts !== undefined
      ? rawAccounts
      : rawAccounts?.filter((a) => (a as { parent?: number | null }).parent == null);
  const sortedAccounts = useMemo(
    () =>
      accounts
        ? [...accounts].toSorted((a, b) => Math.abs(Number(b.value)) - Math.abs(Number(a.value)))
        : (accounts ?? []),
    [accounts],
  );
  const isLoading = propIsLoading ?? hookIsLoading;

  const virtualizer = useVirtualizer({
    count: sortedAccounts.length,
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
      ) : error && !propAccounts ? (
        <div className="py-8 text-center">
          <p className="mb-4">Error loading accounts. Please try again later.</p>
        </div>
      ) : sortedAccounts.length === 0 ? (
        <AccountsEmptyPlaceholder />
      ) : (
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const account = sortedAccounts[virtualRow.index];
            if (!account) return null;
            return (
              <div
                key={account.id}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <AccountItem account={account} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
