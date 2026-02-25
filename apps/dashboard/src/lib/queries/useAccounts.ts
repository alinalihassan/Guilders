import type { Account, CreateAccount, UpdateAccount } from "@guilders/api/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api, edenError } from "../api";

export const queryKey = ["accounts"] as const;

export function useAccounts() {
  return useQuery<Account[], Error>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await api.account.get();
      if (error) throw new Error(edenError(error));
      return (data ?? []) as Account[];
    },
  });
}

export function useAccount(accountId: number) {
  return useQuery<Account | undefined, Error>({
    queryKey: [...queryKey, accountId],
    queryFn: async () => {
      const { data, error } = await api.account({ id: accountId }).get();
      if (error) throw new Error(edenError(error));
      const result = data as { account: Account; children: Account[] };
      return { ...result.account, children: result.children ?? [] } as Account;
    },
    enabled: !!accountId,
  });
}

export function useAddAccount() {
  const queryClient = useQueryClient();
  return useMutation<Account, Error, CreateAccount>({
    mutationFn: async (account) => {
      const { data, error } = await api.account.post(account as any);
      if (error) throw new Error(edenError(error));
      return data as Account;
    },
    onError: (error) => {
      console.error("Failed to add account:", error);
      toast.error("Failed to add account", {
        description: "Please try again later",
      });
    },
    onSuccess: (newAccount) => {
      queryClient.setQueryData([...queryKey, newAccount.id], newAccount);
      queryClient.setQueryData<Account[]>(queryKey, (old = []) => [...old, newAccount]);
      toast.success("Account added successfully");
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  return useMutation<Account, Error, { id: number; account: UpdateAccount }>({
    mutationFn: async ({ id, account }) => {
      const { data, error } = await api.account({ id }).put(account as any);
      if (error) throw new Error(edenError(error));
      return data as Account;
    },
    onError: (error) => {
      console.error("Failed to update account:", error);
      toast.error("Failed to update account", {
        description: "Please try again later",
      });
    },
    onSuccess: (updatedAccount) => {
      queryClient.setQueryData([...queryKey, updatedAccount.id], updatedAccount);
      queryClient.setQueryData<Account[]>(queryKey, (old = []) =>
        old.map((account) => (account.id === updatedAccount.id ? updatedAccount : account)),
      );
      toast.success("Account updated");
    },
  });
}

export function useRemoveAccount() {
  const queryClient = useQueryClient();
  return useMutation<number, Error, number>({
    mutationFn: async (accountId) => {
      const { error } = await api.account({ id: accountId }).delete();
      if (error) throw new Error(edenError(error));
      return accountId;
    },
    onError: (error) => {
      console.error("Failed to delete account:", error);
      toast.error("Failed to delete account", {
        description: "Please try again later",
      });
    },
    onSuccess: (accountId) => {
      queryClient.removeQueries({ queryKey: [...queryKey, accountId] });
      queryClient.setQueryData<Account[]>(queryKey, (old = []) =>
        old.filter((account) => account.id !== accountId),
      );
      toast.success("Account deleted");
    },
  });
}
