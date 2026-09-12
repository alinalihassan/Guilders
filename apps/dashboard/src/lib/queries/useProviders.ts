import type { Provider } from "@guilders/api/types";
import { useQuery } from "@tanstack/react-query";

import { api, rpcJson } from "@/lib/api";

const queryKey = ["providers"] as const;

export function useProviders() {
  return useQuery<Provider[], Error>({
    queryKey,
    queryFn: async () => rpcJson<Provider[]>(await api.provider.$get()),
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
