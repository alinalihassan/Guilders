import type { Transaction, TransactionInsert } from "@guilders/api/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api, edenError } from "../api";
import { queryKey as accountQueryKey } from "./useAccounts";

export const queryKey = ["transactions"] as const;

export function useTransactions(accountId?: number) {
  return useQuery({
    queryKey: accountId ? [...queryKey, accountId] : queryKey,
    queryFn: async (): Promise<Transaction[]> => {
      const { data, error } = await api.transaction.get(
        accountId ? { query: { accountId } } : {},
      );
      if (error) throw new Error(edenError(error));
      return (data ?? []) as Transaction[];
    },
  });
}

export function useTransaction(transactionId: number) {
  return useQuery({
    queryKey: [...queryKey, transactionId],
    queryFn: async (): Promise<Transaction> => {
      const { data, error } = await api.transaction({ id: transactionId }).get();
      if (error) throw new Error(edenError(error));
      return data as Transaction;
    },
  });
}

export function useAddTransaction() {
  const queryClient = useQueryClient();
  return useMutation<Transaction, Error, TransactionInsert>({
    mutationFn: async (transaction) => {
      const { data, error } = await api.transaction.post(transaction);
      if (error) throw new Error(edenError(error));
      return data as Transaction;
    },
    onError: (error) => {
      console.error("Failed to add transaction:", error);
      toast.error("Failed to add transaction", {
        description: "Please try again later",
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
      mutationFn: async ({ transactionId, transaction }) => {
        const { data, error } = await api
          .transaction({ id: transactionId })
          .put(transaction);
        if (error) throw new Error(edenError(error));
        return data as Transaction;
      },
      onError: (error) => {
        console.error("Failed to update transaction:", error);
        toast.error("Failed to update transaction", {
          description: "Please try again later",
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
    mutationFn: async (transaction) => {
      const { error } = await api.transaction({ id: transaction.id }).delete();
      if (error) throw new Error(edenError(error));
      return transaction.id;
    },
    onError: (error) => {
      console.error("Failed to delete transaction:", error);
      toast.error("Failed to delete transaction", {
        description: "Please try again later",
      });
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
