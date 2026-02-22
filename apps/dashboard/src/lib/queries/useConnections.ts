import { getApiClient } from "@/lib/api";
import type { ConnectionResponse } from "@guilders/api/types";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

export function useRegisterConnection() {
  return useMutation({
    mutationFn: async (providerId: string) => {
      const api = await getApiClient();
      const response = await api.connections.register.$post({
        json: { provider_id: providerId },
      });
      const { data, error } = await response.json();
      if (error || !data)
        throw new Error(error || "Failed to register connection");
      return data;
    },
    onError: (error) => {
      toast.error("Failed to register connection", {
        description: error.message,
      });
    },
  });
}

export function useDeregisterConnection() {
  return useMutation({
    mutationFn: async (providerId: string) => {
      const api = await getApiClient();
      const response = await api.connections.deregister.$post({
        json: { provider_id: providerId },
      });
      const { data, error } = await response.json();
      if (error || !data) {
        console.error(data, error);
        throw new Error(error || "Failed to deregister connection");
      }

      return data;
    },
    onError: (error) => {
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
      const api = await getApiClient();
      const response = await api.connections.$post({
        json: { provider_id: providerId, institution_id: institutionId },
      });
      const { data, error } = await response.json();
      if (error || !data) {
        throw new Error(error || "Failed to create connection");
      }

      return data;
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to create connection", {
        description: error.message,
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
      const api = await getApiClient();
      const response = await api.connections.reconnect.$post({
        json: {
          provider_id: providerId,
          institution_id: institutionId,
          account_id: accountId,
        },
      });
      const { data, error } = await response.json();
      if (error || !data) throw new Error(error || "Failed to reconnect");

      return data;
    },
    onError: (error) => {
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
    }): Promise<void> => {
      const api = await getApiClient();
      const response = await api.connections.refresh.$post({
        json: {
          provider_id: providerId,
          connection_id: connectionId,
        },
      });
      const { error } = await response.json();
      if (error) throw new Error(error);
    },
    onError: (error) => {
      toast.error("Failed to refresh connection", {
        description: error.message,
      });
    },
    onSuccess: () => {
      toast.success("Connection refreshed", {
        description: "Your connection has been refreshed successfully.",
      });
    },
  });
}
