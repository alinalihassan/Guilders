import type { Account } from "@guilders/api/types";
import { useMemo } from "react";

import { AccountItem } from "@/components/dashboard/accounts/account-item";
import { AccountsEmptyPlaceholder } from "@/components/dashboard/accounts/accounts-placeholder";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccounts } from "@/lib/queries/useAccounts";

interface AccountsTableProps {
  accounts?: Account[];
  isLoading?: boolean;
}

export function AccountsTable({
  accounts: propAccounts,
  isLoading: propIsLoading,
}: AccountsTableProps) {
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
        : accounts,
    [accounts],
  );
  const isLoading = propIsLoading ?? hookIsLoading;

  return (
    <div className="space-y-2">
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, index) => (
            <Skeleton key={index} className="h-10 w-full mb-2" />
          ))}
        </div>
      ) : error && !propAccounts ? (
        <div className="text-center py-8">
          <p className="mb-4">Error loading accounts. Please try again later.</p>
        </div>
      ) : sortedAccounts && sortedAccounts.length === 0 ? (
        <AccountsEmptyPlaceholder />
      ) : (
        sortedAccounts?.map((account) => <AccountItem key={account.id} account={account} />)
      )}
    </div>
  );
}
