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
        transactions
          .toSorted((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .map((transaction) => <TransactionItem key={transaction.id} transaction={transaction} />)
      )}
    </div>
  );
}
