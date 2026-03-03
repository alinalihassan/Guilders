import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

// @ts-ignore TODO: Better Auth 1.5.0 issue, subscription type not inferred from stripeClient plugin
const subscriptionClient = authClient.subscription as {
  upgrade: (opts: {
    plan: string;
    successUrl: string;
    cancelUrl: string;
    disableRedirect: boolean;
    scheduleAtPeriodEnd?: boolean;
  }) => Promise<unknown>;
  billingPortal: (opts: {
    returnUrl: string;
    disableRedirect: boolean;
  }) => Promise<{ data: { url?: string } | null; error: { message?: string } | null }>;
};

function getSubscriptionUrl() {
  return `${window.location.origin}/settings/subscription`;
}

export function useSubscription() {
  return useMutation({
    mutationFn: async () => {
      const url = getSubscriptionUrl();
      await subscriptionClient.upgrade({
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
      const { data, error } = await subscriptionClient.billingPortal({
        returnUrl: getSubscriptionUrl(),
        disableRedirect: true,
      });
      if (error) throw new Error(error.message ?? "Unknown error");
      if (data?.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      console.error("Failed to open customer portal:", error);
      toast.error("Failed to open customer portal", {
        description: "Please try again later.",
      });
    },
  });
}
