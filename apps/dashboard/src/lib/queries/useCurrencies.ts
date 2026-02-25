import type { Currency } from "@guilders/api/types";
import { useQuery } from "@tanstack/react-query";

import { api, edenError } from "@/lib/api";

const queryKey = ["currencies"] as const;

export function useCurrencies() {
  return useQuery<Currency[]>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await api.currency.get();
      if (error) throw new Error(edenError(error));
      return (data ?? []) as Currency[];
    },
  });
}
