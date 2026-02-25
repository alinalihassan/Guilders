import type { Transaction } from "@guilders/api/types";
import NumberFlow from "@number-flow/react";

import { useDialog } from "@/hooks/useDialog";

interface TransactionItemProps {
  transaction: Transaction;
}

export function TransactionItem({ transaction }: TransactionItemProps) {
  const { open } = useDialog("editTransaction");
  const amount = Number(transaction.amount);

  return (
    <div
      className="flex cursor-pointer items-center justify-between rounded-lg p-2 hover:bg-secondary"
      onClick={() => open({ transaction })}
    >
      <div className="flex items-center">
        <div
          className={`mr-3 flex h-8 w-8 items-center justify-center rounded-full ${
            amount > 0
              ? "bg-green-100 dark:bg-green-900"
              : amount < 0
                ? "bg-red-100 dark:bg-red-900"
                : "bg-gray-100 dark:bg-gray-700"
          }`}
        >
          <span
            className={`text-xl ${
              amount > 0
                ? "text-green-600 dark:text-green-400"
                : amount < 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-gray-600 dark:text-gray-400"
            }`}
          >
            {amount > 0 ? "↑" : amount < 0 ? "↓" : "→"}
          </span>
        </div>
        <div className="max-w-[300px]">
          <p
            className={`font-mono font-medium ${
              amount > 0
                ? "text-green-600 dark:text-green-400"
                : amount < 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-gray-900 dark:text-white"
            }`}
          >
            <NumberFlow
              value={Math.abs(amount)}
              format={{
                style: "currency",
                currency: transaction.currency,
              }}
            />
          </p>
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
            {transaction.description}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {new Date(transaction.date).toLocaleDateString()}
        </p>
        <p className="text-xs text-gray-500">{new Date(transaction.date).toLocaleTimeString()}</p>
      </div>
    </div>
  );
}
