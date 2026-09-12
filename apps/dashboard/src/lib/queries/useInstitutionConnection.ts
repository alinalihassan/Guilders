import type { InstitutionConnection } from "@guilders/api/types";
import { useQuery } from "@tanstack/react-query";

import { api, rpcJson } from "@/lib/api";

const queryKey = ["institution-connections"] as const;

export function useInstitutionConnections() {
  return useQuery({
    queryKey,
    queryFn: async () =>
      rpcJson<InstitutionConnection[]>(await api["institution-connection"].$get()),
  });
}

export function useInstitutionConnection(connectionId: number) {
  return useQuery({
    queryKey: [...queryKey, connectionId],
    queryFn: async () =>
      rpcJson<InstitutionConnection>(
        await api["institution-connection"][":id"].$get({ param: { id: String(connectionId) } }),
      ),
    enabled: !!connectionId,
  });
}
