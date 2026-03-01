import type { ConnectionResponse } from "@guilders/api/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api, edenError } from "@/lib/api";
import { queryKey as accountQueryKey } from "./useAccounts";

export function useRegisterConnection() {
  return useMutation({
    mutationFn: async (providerId: string) => {
      const { data, error } = await (api as Record<string, any>).connections.register.post({
        provider_id: providerId,
      });
      if (error) throw new Error(edenError(error));
      return data;
    },
    onError: (error) => {
      console.error("Failed to register connection:", error);
      toast.error("Failed to register connection", {
        description: error.message,
      });
    },
  });
}

export function useDeregisterConnection() {
  return useMutation({
    mutationFn: async (providerId: string) => {
      const { data, error } = await (api as Record<string, any>).connections.deregister.post({
        provider_id: providerId,
      });
      if (error) throw new Error(edenError(error));
      return data;
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
    }): Promise<ConnectionResponse> => {
      const { data, error } = await (api as Record<string, any>).connections.post({
        provider_id: providerId,
        institution_id: institutionId,
      });
      if (error) throw new Error(edenError(error));
      return data as ConnectionResponse;
    },
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
    }): Promise<ConnectionResponse> => {
      const { data, error } = await (api as Record<string, any>).connections.reconnect.post({
        provider_id: providerId,
        institution_id: institutionId,
        account_id: accountId,
      });
      if (error) throw new Error(edenError(error));
      return data as ConnectionResponse;
    },
    onError: (error) => {
      console.error("Failed to reconnect:", error);
      toast.error("Failed to reconnect", {
        description: error.message,
      });
    },
  });
}

export function useRefreshConnection() {
  return useMutation({
    mutationFn: async ({
      providerId,
      connectionId,
    }: {
      providerId: string;
      connectionId: string;
    }): Promise<{ success: boolean; redirectURI?: string; type?: "redirect" | "popup" }> => {
      const { data, error } = await (api as Record<string, any>).connections.refresh.post({
        provider_id: providerId,
        connection_id: connectionId,
      });
      if (error) throw new Error(edenError(error));
      return data as { success: boolean; redirectURI?: string; type?: "redirect" | "popup" };
    },
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
      const { error } = await (api as Record<string, any>).connections.sync.post({
        account_id: accountId,
      });
      if (error) throw new Error(edenError(error));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountQueryKey });
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
