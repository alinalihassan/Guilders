import type { ConnectionResponse } from "@guilders/api/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api, rpcJson } from "@/lib/api";

import { queryKey as accountQueryKey } from "./useAccounts";
import { queryKey as categoryQueryKey } from "./useCategories";
import { queryKey as merchantQueryKey } from "./useMerchants";
import { queryKey as providerConnectionQueryKey } from "./useProviderConnections";
import { queryKey as transactionQueryKey } from "./useTransactions";

export function useRegisterConnection() {
  return useMutation({
    mutationFn: async (providerId: string) =>
      rpcJson(await api.connections.register.$post({ json: { provider_id: providerId } })),
    onError: (error) => {
      console.error("Failed to register connection:", error);
      toast.error("Failed to register connection", {
        description: error.message,
      });
    },
  });
}

export function useConnectApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ providerId, apiKey }: { providerId: string; apiKey: string }) =>
      rpcJson<{ success: boolean; accounts: number; institutions: number }>(
        await api.connections["api-key"].$post({
          json: { provider_id: providerId, api_key: apiKey },
        }),
      ),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: providerConnectionQueryKey });
      queryClient.invalidateQueries({ queryKey: accountQueryKey });
      queryClient.invalidateQueries({ queryKey: transactionQueryKey });
      toast.success("Lunch Flow connected", {
        description:
          result.accounts > 0
            ? `Imported ${result.accounts} account${result.accounts === 1 ? "" : "s"}.`
            : "API key saved. No active accounts were found yet.",
      });
    },
    onError: (error) => {
      console.error("Failed to connect Lunch Flow:", error);
      toast.error("Failed to connect Lunch Flow", {
        description: error.message,
      });
    },
  });
}

export function useDeregisterConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (providerId: string) =>
      rpcJson(await api.connections.deregister.$post({ json: { provider_id: providerId } })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountQueryKey });
      queryClient.invalidateQueries({ queryKey: transactionQueryKey });
    },
    onError: (error) => {
      console.error("Failed to deregister connection:", error);
      toast.error("Failed to deregister connection", {
        description: error.message,
      });
    },
  });
}

export function useCreateConnection() {
  return useMutation({
    mutationFn: async ({
      providerId,
      institutionId,
    }: {
      providerId: string;
      institutionId: string;
    }): Promise<ConnectionResponse> =>
      rpcJson<ConnectionResponse>(
        await api.connections.$post({
          json: {
            provider_id: providerId,
            institution_id: institutionId,
          },
        }),
      ),
    onError: (error) => {
      console.error("Failed to create connection:", error);
      toast.error("Failed to create connection", {
        description: "Failed to register with provider",
      });
    },
  });
}

export function useReconnectConnection() {
  return useMutation({
    mutationFn: async ({
      providerId,
      institutionId,
      accountId,
    }: {
      providerId: string;
      institutionId: string;
      accountId: string;
    }): Promise<ConnectionResponse> =>
      rpcJson<ConnectionResponse>(
        await api.connections.reconnect.$post({
          json: {
            provider_id: providerId,
            institution_id: institutionId,
            account_id: accountId,
          },
        }),
      ),
    onError: (error) => {
      console.error("Failed to reconnect:", error);
      toast.error("Failed to reconnect", {
        description: error.message,
      });
    },
  });
}

type RefreshConnectionResult = {
  redirectURI?: string;
  type?: "redirect" | "popup";
};

export function useRefreshConnection() {
  return useMutation<RefreshConnectionResult, Error, { providerId: string; connectionId: string }>({
    mutationFn: async ({ providerId, connectionId }) =>
      rpcJson<RefreshConnectionResult>(
        await api.connections.refresh.$post({
          json: {
            provider_id: providerId,
            connection_id: connectionId,
          },
        }),
      ),
    onError: (error) => {
      console.error("Failed to refresh connection:", error);
      toast.error("Failed to refresh connection", {
        description: error.message,
      });
    },
  });
}

export function useSyncAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId }: { accountId: string }): Promise<void> => {
      await rpcJson(await api.connections.sync.$post({ json: { account_id: accountId } }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountQueryKey });
      queryClient.invalidateQueries({ queryKey: transactionQueryKey });
      queryClient.invalidateQueries({ queryKey: merchantQueryKey });
      queryClient.invalidateQueries({ queryKey: categoryQueryKey });
      toast.success("Account data synced");
    },
    onError: (error) => {
      console.error("Failed to sync account data:", error);
      toast.error("Failed to sync data", {
        description: error.message,
      });
    },
  });
}
