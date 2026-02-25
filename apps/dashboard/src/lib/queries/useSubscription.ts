import type { CheckoutResponse, PortalResponse } from "@guilders/api/types";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { api, edenError } from "@/lib/api";

export function useSubscription() {
  return useMutation({
    mutationFn: async (): Promise<CheckoutResponse> => {
      const { data, error } = await (api as Record<string, any>).subscription.post();
      if (error) throw new Error(edenError(error));
      return data as CheckoutResponse;
    },
    onError: (error) => {
      console.error("Failed to create subscription:", error);
      toast.error("Failed to create subscription", {
        description: "Please try again later.",
      });
    },
  });
}

export function usePortalSession() {
  return useMutation({
    mutationFn: async (): Promise<PortalResponse> => {
      const { data, error } = await (api as Record<string, any>).subscription.portal.post();
      if (error) throw new Error(edenError(error));
      return data as PortalResponse;
    },
    onError: (error) => {
      console.error("Failed to open customer portal:", error);
      toast.error("Failed to open customer portal", {
        description: "Please try again later.",
      });
    },
  });
}
