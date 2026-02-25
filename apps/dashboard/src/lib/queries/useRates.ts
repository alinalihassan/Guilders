import type { Rate } from "@guilders/api/types";
import { useQuery } from "@tanstack/react-query";

import { api, edenError } from "../api";

const queryKey = ["rates"] as const;

export function useRates() {
  return useQuery<Rate[], Error>({
    queryKey,
    queryFn: async (): Promise<Rate[]> => {
      const { data, error } = await api.rate.get({ query: { base: "EUR" } });
      if (error) {
        const status = (error as { status?: number }).status;
        if (status === 404 || status === 501) return [];
        throw new Error(edenError(error));
      }
      return Array.isArray(data) ? (data as Rate[]) : [];
    },
  });
}
