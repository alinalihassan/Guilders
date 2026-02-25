import type { Provider } from "@guilders/api/types";
import { useQuery } from "@tanstack/react-query";

import { api, edenError } from "@/lib/api";

const queryKey = ["providers"] as const;

export function useProviders() {
  return useQuery<Provider[], Error>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await api.provider.get();
      if (error) {
        const status = (error as { status?: number }).status;
        if (status === 404 || status === 501) return [];
        throw new Error(edenError(error));
      }
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
