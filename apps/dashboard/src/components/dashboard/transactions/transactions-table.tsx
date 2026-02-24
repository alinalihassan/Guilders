import { Skeleton } from "@/components/ui/skeleton";
import { useTransactions } from "@/lib/queries/useTransactions";

import { TransactionItem } from "./transaction-item";
import { TransactionsEmptyPlaceholder } from "./transactions-placeholder";

export function TransactionsTable({ accountId }: { accountId?: number }) {
  const { data: transactions, isLoading, error } = useTransactions(accountId);

  return (
    <div className="space-y-2">
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, index) => (
            <Skeleton key={index} className="h-10 w-full mb-2" />
          ))}
        </div>
      ) : error || !transactions ? (
        <div className="text-center py-8">
          <p className="mb-4">Error loading transactions. Please try again later.</p>
        </div>
      ) : transactions.length === 0 ? (
        <TransactionsEmptyPlaceholder accountId={accountId} />
      ) : (
        transactions
          .toSorted((a, b) => b.date.localeCompare(a.date))
          .map((transaction) => <TransactionItem key={transaction.id} transaction={transaction} />)
      )}
    </div>
  );
}
