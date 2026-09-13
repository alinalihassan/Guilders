import type { Account } from "@guilders/api/types";

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

  const rawAccounts = propAccounts ?? hookAccounts;
  const accounts =
    propAccounts !== undefined
      ? rawAccounts
      : rawAccounts?.filter((a) => (a as { parent?: number | null }).parent == null);
  const sortedAccounts = accounts
    ? [...accounts].toSorted((a, b) => Math.abs(Number(b.value)) - Math.abs(Number(a.value)))
    : accounts;
  const isLoading = propIsLoading ?? hookIsLoading;

  return (
    <div className="flex flex-col">
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[...Array(4)].map((_, index) => (
            <Skeleton key={index} className="h-9 w-full" />
          ))}
        </div>
      ) : error && !propAccounts ? (
        <p className="text-destructive py-8 text-center text-sm">
          Could not load accounts. Please try again later.
        </p>
      ) : sortedAccounts && sortedAccounts.length === 0 ? (
        <AccountsEmptyPlaceholder />
      ) : (
        sortedAccounts?.map((account) => <AccountItem key={account.id} account={account} />)
      )}
    </div>
  );
}
