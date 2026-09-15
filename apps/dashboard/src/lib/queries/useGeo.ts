import { useQuery } from "@tanstack/react-query";

import { api, rpcJson } from "../api";

export type GeoResponse = {
  country: string | null;
};

export function useGeo() {
  return useQuery<GeoResponse, Error>({
    queryKey: ["geo"],
    queryFn: async () => rpcJson<GeoResponse>(await api.geo.$get()),
    staleTime: 60 * 60 * 1000,
  });
}
