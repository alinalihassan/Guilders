import { getApiClient } from "@/lib/api";
import type { CheckoutResponse, PortalResponse } from "@guilders/api/types";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

async function handleSubscriptionResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 404 || response.status === 501) {
      throw new Error("Billing is not available yet");
    }
    throw new Error(errorData.error || `Error: ${response.status}`);
  }
  return response.json();
}

export function useSubscription() {
  return useMutation({
    mutationFn: async (): Promise<CheckoutResponse> => {
      const api = await getApiClient();
      const response = await api.subscription.$post();
      return handleSubscriptionResponse(response);
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
      return handleSubscriptionResponse(response);
    },
    onError: (error) => {
      toast.error("Failed to open customer portal", {
        description: error.message || "Please try again later.",
      });
    },
  });
}
