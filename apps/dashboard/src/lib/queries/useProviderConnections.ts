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
      const { data, error } = await response.json();
      if (error || !data) throw new Error(error);
      return data;
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
      const { data, error } = await response.json();
      if (error || !data) throw new Error(error);
      return data;
    },
    enabled: !!connectionId,
  });
}
