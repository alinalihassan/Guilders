import { getApiClient } from "@/lib/api";
import type { ConnectionResponse } from "@guilders/api/types";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

// Connection endpoints are not implemented in the new backend yet.
// These mutations will fail gracefully with a toast message.

async function handleConnectionResponse(response: Response) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 404 || response.status === 501) {
      throw new Error("Connection management is not available yet");
    }
    throw new Error(errorData.error || `Error: ${response.status}`);
  }
  return response.json();
}

export function useRegisterConnection() {
  return useMutation({
    mutationFn: async (providerId: string) => {
      const api = await getApiClient();
      const response = await api.connections.register.$post({
        json: { provider_id: providerId },
      });
      return handleConnectionResponse(response);
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
      return handleConnectionResponse(response);
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
      return handleConnectionResponse(response);
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
      return handleConnectionResponse(response);
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
      await handleConnectionResponse(response);
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
