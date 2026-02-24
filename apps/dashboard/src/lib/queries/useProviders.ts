import { useQuery } from "@tanstack/react-query";
import type { Provider } from "@guilders/api/types";

import { getApiClient } from "@/lib/api";

const queryKey = ["providers"] as const;

export function useProviders() {
  return useQuery<Provider[], Error>({
    queryKey,
    queryFn: async () => {
      const api = await getApiClient();
      const response = await api.providers.$get();
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // Return empty array if providers endpoint is not implemented yet
        if (response.status === 404 || response.status === 501) {
          return [];
        }
        throw new Error(errorData.error || "Failed to fetch providers");
      }
      const data = await response.json();
      return (data ?? []) as Provider[];
    },
  });
}

export function useProviderById(providerId: number | undefined) {
  const { data: providers } = useProviders();
  return providers?.find((p) => p.id === providerId);
}

export function useProviderByName(providerName: string | undefined) {
  const { data: providers } = useProviders();
  return providers?.find((p) => p.name === providerName);
}
