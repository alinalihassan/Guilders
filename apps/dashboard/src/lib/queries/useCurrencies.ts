import type { Currency } from "@guilders/api/types";
import { useQuery } from "@tanstack/react-query";

import { api, rpcJson } from "@/lib/api";

const queryKey = ["currencies"] as const;

export function useCurrencies() {
  return useQuery<Currency[]>({
    queryKey,
    queryFn: async () => rpcJson<Currency[]>(await api.currency.$get()),
  });
}
