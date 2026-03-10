import { useMemo } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useMerchants } from "@/lib/queries/useMerchants";
import { useTransactions } from "@/lib/queries/useTransactions";

import { TransactionItem } from "./transaction-item";
import { TransactionsEmptyPlaceholder } from "./transactions-placeholder";

export function TransactionsTable({ accountId }: { accountId?: number }) {
  const { data: transactions, isLoading, error } = useTransactions(accountId);
  const { data: merchants } = useMerchants();
  const merchantsById = useMemo(() => new Map(merchants?.map((m) => [m.id, m]) ?? []), [merchants]);

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
          .toSorted((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .map((transaction) => (
            <TransactionItem
              key={transaction.id}
              transaction={transaction}
              merchant={
                transaction.merchant_id != null
                  ? merchantsById.get(transaction.merchant_id)
                  : undefined
              }
            />
          ))
      )}
    </div>
  );
}
