import type { Rate } from "@guilders/api/types";
import { useQuery } from "@tanstack/react-query";

import { getApiClient } from "../api";

const queryKey = ["rates"] as const;

export function useRates() {
  return useQuery<Rate[], Error>({
    queryKey,
    queryFn: async (): Promise<Rate[]> => {
      const api = await getApiClient();
      const response = await api.rates.$get({ query: { base: "EUR" } });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // Return empty list if endpoint is not implemented yet.
        if (response.status === 404 || response.status === 501) {
          return [];
        }
        throw new Error(errorData.error || "Failed to fetch rates");
      }
      const data = await response.json();

      console.log("Rates data:", data);
      return Array.isArray(data) ? (data as Rate[]) : [];
    },
  });
}
