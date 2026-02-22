import { useQuery } from "@tanstack/react-query";
import { getApiClient } from "../api";

const queryKey = ["rates"] as const;

export function useRates() {
  return useQuery({
    queryKey,
    queryFn: async () => {
      const api = await getApiClient();
      const response = await api.rates.$get({ query: { base: "EUR" } });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // Return undefined if endpoint not implemented (financial.ts handles undefined)
        if (response.status === 404 || response.status === 501) {
          return undefined;
        }
        throw new Error(errorData.error || "Failed to fetch rates");
      }
      const data = await response.json();
      return data;
    },
  });
}
