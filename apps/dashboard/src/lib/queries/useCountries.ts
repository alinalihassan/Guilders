import type { Country } from "@guilders/api/types";
import { useQuery } from "@tanstack/react-query";

import { getApiClient } from "../api";

const queryKey = ["countries"] as const;

export function useCountries() {
  return useQuery<Country[], Error>({
    queryKey,
    queryFn: async () => {
      const api = await getApiClient();
      const response = await api.countries.$get();
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch countries");
      }
      const data = await response.json();
      return data as Country[];
    },
  });
}

export function useCountriesMap() {
  const { data } = useCountries();
  return data?.reduce(
    (acc, country) => {
      acc[country.code] = country.name;
      return acc;
    },
    {} as Record<string, string>,
  );
}

export function useCountry(code: string) {
  return useQuery<Country, Error>({
    queryKey: [...queryKey, code],
    queryFn: async () => {
      const api = await getApiClient();
      const response = await api.countries[":code"].$get({ param: { code } });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch country");
      }
      const data = await response.json();
      return data as Country;
    },
  });
}
