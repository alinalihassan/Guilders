import { getApiClient } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

const queryKey = ["providers"] as const;

export function useProviders() {
  return useQuery({
    queryKey,
    queryFn: async () => {
      const api = await getApiClient();
      const response = await api.providers.$get();
      const { data, error } = await response.json();
      if (error) throw new Error(error);
      return data;
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
