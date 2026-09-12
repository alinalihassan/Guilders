import { useQuery } from "@tanstack/react-query";

import { api, rpcJson } from "@/lib/api";

const queryKey = ["billing"] as const;

export function useBillingConfig() {
  return useQuery({
    queryKey,
    queryFn: async () => rpcJson<{ billingEnabled: boolean }>(await api.billing.$get()),
  });
}
