import type { Account, CreateAccount, UpdateAccount } from "@guilders/api/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getApiClient } from "../api";

export const queryKey = ["accounts"] as const;

export function useAccounts() {
  return useQuery<Account[], Error>({
    queryKey,
    queryFn: async (): Promise<Account[]> => {
      const api = await getApiClient();
      const response = await api.accounts.$get();
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Failed to fetch accounts");
      return (data ?? []) as Account[];
    },
  });
}

export function useAccount(accountId: number) {
  return useQuery<Account | undefined, Error>({
    queryKey: [...queryKey, accountId],
    queryFn: async (): Promise<Account> => {
      const api = await getApiClient();
      const response = await api.accounts[":id"].$get({
        param: {
          id: accountId.toString(),
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Failed to fetch account");
      return { ...data.account, children: data.children ?? [] } as Account;
    },
    enabled: !!accountId,
  });
}

export function useAddAccount() {
  const queryClient = useQueryClient();
  return useMutation<Account, Error, CreateAccount>({
    mutationFn: async (account): Promise<Account> => {
      const api = await getApiClient();
      const response = await api.accounts.$post({
        json: account,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || `Error: ${response.status} ${response.statusText}`);
      }
      return data as Account;
    },
    onError: () => {
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
    mutationFn: async ({ id, account }): Promise<Account> => {
      const api = await getApiClient();
      const response = await api.accounts[":id"].$put({
        param: {
          id: id.toString(),
        },
        json: account,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || `Error: ${response.status} ${response.statusText}`);
      }
      return data as Account;
    },
    onError: () => {
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
    mutationFn: async (accountId): Promise<number> => {
      const api = await getApiClient();
      const response = await api.accounts[":id"].$delete({
        param: {
          id: accountId.toString(),
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || `Error: ${response.status} ${response.statusText}`);
      }

      return accountId;
    },
    onError: () => {
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
