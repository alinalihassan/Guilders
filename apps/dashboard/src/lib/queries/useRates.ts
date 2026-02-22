import { useQuery } from "@tanstack/react-query";
import { getApiClient } from "../api";

const queryKey = ["rates"] as const;

export function useRates() {
  return useQuery({
    queryKey,
    queryFn: async () => {
      const api = await getApiClient();
      const response = await api.rates.$get({ query: { base: "EUR" } });
      const { data, error } = await response.json();
      if (error || !data) throw new Error(error);
      return data;
    },
  });
}
