import type { Country } from "@guilders/api/types";
import { useQuery } from "@tanstack/react-query";

import { api, edenError } from "../api";

const queryKey = ["countries"] as const;

export function useCountries() {
  return useQuery<Country[], Error>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await api.country.get();
      if (error) throw new Error(edenError(error));
      return (data ?? []) as Country[];
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
      const { data, error } = await api.country({ code }).get();
      if (error) throw new Error(edenError(error));
      return data as Country;
    },
  });
}
