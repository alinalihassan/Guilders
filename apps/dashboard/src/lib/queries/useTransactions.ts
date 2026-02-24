import type { Transaction, TransactionInsert } from "@guilders/api/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getApiClient } from "../api";
import { queryKey as accountQueryKey } from "./useAccounts";

export const queryKey = ["transactions"] as const;
type ApiTransaction = Transaction & { asset_id?: number; account_id?: number };

export function useTransactions(accountId?: number) {
  return useQuery({
    queryKey,
    queryFn: async (): Promise<Transaction[]> => {
      const api = await getApiClient();
      const response = await api.transactions.$get({
        query: {
          accountId: accountId,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Failed to fetch transactions");
      return (data as ApiTransaction[]).map((transaction) => ({
        ...transaction,
        account_id: transaction.account_id ?? transaction.asset_id,
      }));
    },
  });
}

export function useTransaction(transactionId: number) {
  return useQuery({
    queryKey: [...queryKey, transactionId],
    queryFn: async (): Promise<Transaction> => {
      const api = await getApiClient();
      const response = await api.transactions[":id"].$get({
        param: {
          id: transactionId.toString(),
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Failed to fetch transaction");
      const transaction = data as ApiTransaction;
      return {
        ...transaction,
        account_id: transaction.asset_id ?? transaction.account_id,
      };
    },
  });
}

export function useAddTransaction() {
  const queryClient = useQueryClient();
  return useMutation<Transaction, Error, TransactionInsert>({
    mutationFn: async (transaction): Promise<Transaction> => {
      const api = await getApiClient();
      const response = await api.transactions.$post({
        json: {
          ...transaction,
          account_id: (transaction as ApiTransaction).account_id,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || `Error: ${response.status} ${response.statusText}`);
      }
      return {
        ...(data as ApiTransaction),
        account_id:
          (data as ApiTransaction).account_id ?? (transaction as ApiTransaction).account_id,
      };
    },
    onError: (error) => {
      toast.error("Failed to add transaction", {
        description: error.message || "Please try again later",
      });
    },
    onSuccess: (newTransaction) => {
      queryClient.setQueryData<Transaction[]>(queryKey, (old = []) => [...old, newTransaction]);
      queryClient.invalidateQueries({
        queryKey: [...accountQueryKey, newTransaction.account_id],
      });
      queryClient.invalidateQueries({
        queryKey: accountQueryKey,
      });

      toast.success("Transaction added successfully");
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation<Transaction, Error, { transactionId: number; transaction: TransactionInsert }>(
    {
      mutationFn: async ({ transactionId, transaction }): Promise<Transaction> => {
        const api = await getApiClient();
        const response = await api.transactions[":id"].$put({
          param: {
            id: transactionId.toString(),
          },
          json: {
            ...transaction,
            account_id: (transaction as ApiTransaction).account_id,
          },
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || `Error: ${response.status} ${response.statusText}`);
        }
        return {
          ...(data as ApiTransaction),
          account_id:
            (data as ApiTransaction).account_id ?? (transaction as ApiTransaction).account_id,
        };
      },
      onError: (error) => {
        toast.error("Failed to update transaction", {
          description: error.message || "Please try again later",
        });
      },
      onSuccess: (updatedTransaction) => {
        queryClient.setQueryData<Transaction[]>(queryKey, (old = []) =>
          old.map((transaction) =>
            transaction.id === updatedTransaction.id ? updatedTransaction : transaction,
          ),
        );

        queryClient.invalidateQueries({
          queryKey: [...accountQueryKey, updatedTransaction.account_id],
        });
        queryClient.invalidateQueries({
          queryKey: accountQueryKey,
        });

        toast.success("Transaction updated");
      },
    },
  );
}

export function useRemoveTransaction() {
  const queryClient = useQueryClient();
  return useMutation<number, Error, Transaction>({
    mutationFn: async (transaction): Promise<number> => {
      const api = await getApiClient();
      const response = await api.transactions[":id"].$delete({
        param: {
          id: transaction.id.toString(),
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || `Error: ${response.status} ${response.statusText}`);
      }

      return transaction.id;
    },
    onSuccess: (transactionId, transaction) => {
      queryClient.setQueryData<Transaction[]>(queryKey, (old = []) =>
        old.filter((t) => t.id !== transactionId),
      );

      queryClient.invalidateQueries({
        queryKey: [...accountQueryKey, transaction.account_id],
      });
      queryClient.invalidateQueries({
        queryKey: accountQueryKey,
      });

      toast.success("Transaction deleted");
    },
  });
}
