
import { useQuery } from "@tanstack/react-query";

import { api, edenError } from "@/lib/api";

const queryKey = ["billing"] as const;

export function useBillingConfig() {
  return useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await api.billing.get();
      if (error) throw new Error(edenError(error));
      return data;
    },
  });
}
