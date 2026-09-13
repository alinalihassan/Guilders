import { useMemo } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useMerchants } from "@/lib/queries/useMerchants";
import { useTransactions } from "@/lib/queries/useTransactions";

import { TransactionsEmptyPlaceholder } from "./transactions-placeholder";
import { TransactionsVirtualList } from "./transactions-virtual-list";

export function TransactionsTable({ accountId }: { accountId?: number }) {
  const { data: transactions, isLoading, error } = useTransactions(accountId);
  const { data: merchants } = useMerchants();
  const merchantsById = useMemo(() => new Map(merchants?.map((m) => [m.id, m]) ?? []), [merchants]);
  const sortedTransactions = transactions
    ? transactions.toSorted(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
    : [];

  return (
    <div className="h-full min-h-0">
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
      ) : transactions.length === 0 ? (
        <TransactionsEmptyPlaceholder accountId={accountId} />
      ) : (
        <TransactionsVirtualList
          transactions={sortedTransactions}
          merchantsById={merchantsById}
          className="h-full max-h-[min(70vh,40rem)]"
        />
      )}
    </div>
  );
}
