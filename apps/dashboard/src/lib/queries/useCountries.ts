import type { Country } from "@guilders/api/types";
import { useQuery } from "@tanstack/react-query";

import { api, rpcJson } from "../api";

const queryKey = ["countries"] as const;

export function useCountries() {
  return useQuery<Country[], Error>({
    queryKey,
    queryFn: async () => rpcJson<Country[]>(await api.country.$get()),
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
    queryFn: async () => rpcJson<Country>(await api.country[":code"].$get({ param: { code } })),
    enabled: !!code,
  });
}
