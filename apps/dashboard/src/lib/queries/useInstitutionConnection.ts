import { getApiClient } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

const queryKey = ["institution-connections"] as const;

export function useInstitutionConnections() {
  return useQuery({
    queryKey,
    queryFn: async () => {
      const api = await getApiClient();
      const response = await api["institution-connections"].$get();
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Failed to fetch institution connections");
      return data;
    },
  });
}

export function useInstitutionConnection(connectionId: number) {
  return useQuery({
    queryKey: [...queryKey, connectionId],
    queryFn: async () => {
      const api = await getApiClient();
      const response = await api["institution-connections"][":id"].$get({
        param: { id: connectionId.toString() },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Failed to fetch institution connection");
      return data;
    },
    enabled: !!connectionId,
  });
}
