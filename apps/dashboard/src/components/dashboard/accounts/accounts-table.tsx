import { AccountItem } from "@/components/dashboard/accounts/account-item";
import { AccountsEmptyPlaceholder } from "@/components/dashboard/accounts/accounts-placeholder";
import { useAccounts } from "@/lib/queries/useAccounts";
import type { Account } from "@guilders/api/types";
import { Skeleton } from "@/components/ui/skeleton";

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
  const accounts = propAccounts ?? hookAccounts;
  const isLoading = propIsLoading ?? hookIsLoading;

  return (
    <div className="space-y-2">
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
            <Skeleton key={index} className="h-10 w-full mb-2" />
          ))}
        </div>
      ) : error && !propAccounts ? (
        <div className="text-center py-8">
          <p className="mb-4">
            Error loading accounts. Please try again later.
          </p>
        </div>
      ) : accounts && accounts.length === 0 ? (
        <AccountsEmptyPlaceholder />
      ) : (
        accounts?.map((account) => (
          <AccountItem key={account.id} account={account} />
        ))
      )}
    </div>
  );
}
