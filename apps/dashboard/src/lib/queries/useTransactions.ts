import type { Transaction, TransactionInsert } from "@guilders/api/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api, rpcJson } from "../api";
import { queryKey as accountQueryKey } from "./useAccounts";

export const queryKey = ["transactions"] as const;

function toTransactionJson(transaction: TransactionInsert) {
  return {
    ...transaction,
    timestamp:
      transaction.timestamp instanceof Date
        ? transaction.timestamp.toISOString()
        : new Date(transaction.timestamp).toISOString(),
  };
}

export function useTransactions(accountId?: number) {
  return useQuery({
    queryKey: accountId ? [...queryKey, accountId] : queryKey,
    queryFn: async (): Promise<Transaction[]> =>
      rpcJson<Transaction[]>(
        await api.transaction.$get({
          query: accountId ? { accountId: String(accountId) } : {},
        }),
      ),
  });
}

export function useTransaction(transactionId: number) {
  return useQuery({
    queryKey: [...queryKey, transactionId],
    queryFn: async (): Promise<Transaction> =>
      rpcJson<Transaction>(
        await api.transaction[":id"].$get({ param: { id: String(transactionId) } }),
      ),
  });
}

export function useAddTransaction() {
  const queryClient = useQueryClient();
  return useMutation<Transaction, Error, TransactionInsert>({
    mutationFn: async (transaction) =>
      rpcJson<Transaction>(
        await api.transaction.$post({
          json: toTransactionJson(transaction),
        }),
      ),
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
      mutationFn: async ({ transactionId, transaction }) =>
        rpcJson<Transaction>(
          await api.transaction[":id"].$put({
            param: { id: String(transactionId) },
            json: toTransactionJson(transaction),
          }),
        ),
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
      await rpcJson(
        await api.transaction[":id"].$delete({ param: { id: String(transaction.id) } }),
      );
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
