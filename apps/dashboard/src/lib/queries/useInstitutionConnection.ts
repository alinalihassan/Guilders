import { useQuery } from "@tanstack/react-query";

import { api, edenError } from "@/lib/api";

const queryKey = ["institution-connections"] as const;

export function useInstitutionConnections() {
  return useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await api["institution-connection"].get();
      if (error) throw new Error(edenError(error));
      return data;
    },
  });
}

export function useInstitutionConnection(connectionId: number) {
  return useQuery({
    queryKey: [...queryKey, connectionId],
    queryFn: async () => {
      const { data, error } = await api["institution-connection"]({ id: connectionId }).get();
      if (error) throw new Error(edenError(error));
      return data;
    },
    enabled: !!connectionId,
  });
}
