import { getApiClient } from "@/lib/api";
import type {
  ProviderConnection,
  ProviderConnections,
} from "@guilders/api/types";
import { useQuery } from "@tanstack/react-query";

const queryKey = ["provider-connections"] as const;

export function useProviderConnections() {
  return useQuery<ProviderConnections, Error>({
    queryKey,
    queryFn: async () => {
      const api = await getApiClient();
      const response = await api["provider-connections"].$get();
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 404 || response.status === 501) {
          return [];
        }
        throw new Error(errorData.error || "Failed to fetch connections");
      }
      const data = await response.json();
      return data ?? [];
    },
  });
}

export function useProviderConnection(connectionId: number) {
  return useQuery<ProviderConnection, Error>({
    queryKey: [...queryKey, connectionId],
    queryFn: async () => {
      const api = await getApiClient();
      const response = await api["provider-connections"][":id"].$get({
        param: {
          id: connectionId.toString(),
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch connection");
      }
      const data = await response.json();
      return data;
    },
    enabled: !!connectionId,
  });
}
