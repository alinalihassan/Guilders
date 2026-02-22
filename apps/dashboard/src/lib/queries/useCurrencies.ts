import { getApiClient } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

const queryKey = ["currencies"] as const;

export function useCurrencies() {
  return useQuery({
    queryKey,
    queryFn: async () => {
      const api = await getApiClient();
      const response = await api.currencies.$get();
      const { data, error } = await response.json();
      if (error) throw new Error(error);
      return data;
    },
  });
}
