import type { ProviderConnection, ProviderConnections } from "@guilders/api/types";
import { useQuery } from "@tanstack/react-query";

import { api, edenError } from "@/lib/api";

const queryKey = ["provider-connections"] as const;

export function useProviderConnections() {
  return useQuery<ProviderConnections, Error>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await api["provider-connection"].get();
      if (error) {
        const status = (error as { status?: number }).status;
        if (status === 404 || status === 501) return [];
        throw new Error(edenError(error));
      }
      return (data ?? []) as ProviderConnections;
    },
  });
}

export function useProviderConnection(connectionId: number) {
  return useQuery<ProviderConnection, Error>({
    queryKey: [...queryKey, connectionId],
    queryFn: async () => {
      const { data, error } = await api["provider-connection"]({ id: connectionId }).get();
      if (error) throw new Error(edenError(error));
      return data as ProviderConnection;
    },
    enabled: !!connectionId,
  });
}
