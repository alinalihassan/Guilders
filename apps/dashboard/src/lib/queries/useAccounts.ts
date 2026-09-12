import type { Account, CreateAccount, UpdateAccount } from "@guilders/api/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api, rpcJson } from "../api";

export const queryKey = ["accounts"] as const;

export function useAccounts() {
  return useQuery<Account[], Error>({
    queryKey,
    queryFn: async () => rpcJson<Account[]>(await api.account.$get()),
  });
}

export function useAccount(accountId: number) {
  return useQuery<Account | undefined, Error>({
    queryKey: [...queryKey, accountId],
    queryFn: async () => {
      const result = await rpcJson<{ account: Account; children: Account[] }>(
        await api.account[":id"].$get({ param: { id: String(accountId) } }),
      );
      return { ...result.account, children: result.children ?? [] } as Account;
    },
    enabled: !!accountId,
  });
}

export function useAddAccount() {
  const queryClient = useQueryClient();
  return useMutation<Account, Error, CreateAccount>({
    mutationFn: async (account) =>
      rpcJson<Account>(
        await api.account.$post({
          json: account,
        }),
      ),
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
    mutationFn: async ({ id, account }) =>
      rpcJson<Account>(
        await api.account[":id"].$put({
          param: { id: String(id) },
          json: account,
        }),
      ),
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
      await rpcJson(await api.account[":id"].$delete({ param: { id: String(accountId) } }));
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
