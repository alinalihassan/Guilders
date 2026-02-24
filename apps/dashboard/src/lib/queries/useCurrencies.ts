import { useQuery } from "@tanstack/react-query";

import { getApiClient } from "@/lib/api";

const queryKey = ["currencies"] as const;

export function useCurrencies() {
  return useQuery({
    queryKey,
    queryFn: async () => {
      const api = await getApiClient();
      const response = await api.currencies.$get();
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch currencies");
      }
      const data = await response.json();
      return data;
    },
  });
}
