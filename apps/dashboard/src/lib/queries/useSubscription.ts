import { getApiClient } from "@/lib/api";
import type { CheckoutResponse, PortalResponse } from "@guilders/api/types";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

export function useSubscription() {
  return useMutation({
    mutationFn: async (): Promise<CheckoutResponse> => {
      const api = await getApiClient();
      const response = await api.subscription.$post();
      const { data, error } = await response.json();
      if (error || !data) {
        throw new Error(error || "Failed to create subscription");
      }
      return data;
    },
    onError: (error) => {
      toast.error("Failed to create subscription", {
        description: error.message || "Please try again later.",
      });
    },
  });
}

export function usePortalSession() {
  return useMutation({
    mutationFn: async (): Promise<PortalResponse> => {
      const api = await getApiClient();
      const response = await api.subscription.portal.$post();
      const { data, error } = await response.json();
      if (error || !data) {
        throw new Error(error || "Failed to create portal session");
      }
      return data;
    },
    onError: (error) => {
      toast.error("Failed to open customer portal", {
        description: error.message || "Please try again later.",
      });
    },
  });
}
