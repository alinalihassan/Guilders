import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

function getSubscriptionUrl() {
  return `${window.location.origin}/settings/subscription`;
}

export function useSubscription() {
  return useMutation({
    mutationFn: async () => {
      const url = getSubscriptionUrl();
      await authClient.subscription.upgrade({
      await authClient.subscription.upgrade({
        plan: "pro",
        successUrl: url,
        cancelUrl: url,
        disableRedirect: false,
        scheduleAtPeriodEnd: true,
      });
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
    mutationFn: async () => {
      const { data, error } = await authClient.subscription.billingPortal({
        returnUrl: getSubscriptionUrl(),
        disableRedirect: true,
      });
      if (error) throw new Error(error.message ?? "Unknown error");
      if (!data?.url) {
        throw new Error("Billing portal URL was not returned");
      }
      window.location.assign(data.url);
    },
    onError: (error) => {
      console.error("Failed to open customer portal:", error);
      toast.error("Failed to open customer portal", {
        description: "Please try again later.",
      });
    },
  });
}
