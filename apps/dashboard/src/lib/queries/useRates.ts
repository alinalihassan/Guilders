import type { Rate } from "@guilders/api/types";
import { useQuery } from "@tanstack/react-query";

import { api, rpcError } from "../api";

const queryKey = ["rates"] as const;

export function useRates() {
  return useQuery<Rate[], Error>({
    queryKey,
    queryFn: async (): Promise<Rate[]> => {
      const res = await api.rate.$get({ query: { base: "EUR" } });
      if (!res.ok) {
        if (res.status === 404) return [];
        throw new Error(await rpcError(res));
      }
      return res.json() as Promise<Rate[]>;
    },
  });
}
