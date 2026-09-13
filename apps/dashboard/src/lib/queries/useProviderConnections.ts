import type { ProviderConnection, ProviderConnections } from "@guilders/api/types";
import { useQuery } from "@tanstack/react-query";

import { api, rpcJson } from "@/lib/api";

export const queryKey = ["provider-connections"] as const;

export function useProviderConnections() {
  return useQuery<ProviderConnections, Error>({
    queryKey,
    queryFn: async () =>
      (await rpcJson(await api["provider-connection"].$get())) as unknown as ProviderConnections,
  });
}

export function useProviderConnection(connectionId: number) {
  return useQuery<ProviderConnection, Error>({
    queryKey: [...queryKey, connectionId],
    queryFn: async () =>
      rpcJson<ProviderConnection>(
        await api["provider-connection"][":id"].$get({ param: { id: String(connectionId) } }),
      ),
    enabled: !!connectionId,
  });
}
