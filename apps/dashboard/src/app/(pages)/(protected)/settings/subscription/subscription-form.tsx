"use client";

import { Check, Loader2 } from "lucide-react";

import { SettingsSubsection } from "@/components/settings/settings-subsection";
import { Button } from "@/components/ui/button";
import { usePortalSession, useSubscription } from "@/lib/queries/useSubscription";
import { useUser } from "@/lib/queries/useUser";

export function SubscriptionForm() {
  const { data: user, isLoading } = useUser();
  const upgrade = useSubscription();
  const portal = usePortalSession();

  if (isLoading) {
    return <div className="flex items-center justify-center py-6">Loading...</div>;
  }

  const isSubscribed = user?.subscription?.status === "active";
  const isTrialing = user?.subscription?.status === "trialing";
  const periodEnd = user?.subscription?.current_period_end
    ? new Date(user.subscription.current_period_end)
    : null;
  const trialEnd = user?.subscription?.trial_end ? new Date(user.subscription?.trial_end) : null;
  const hasTrialExpired = trialEnd && trialEnd < new Date();

  const description = isTrialing
    ? "You are currently on the Pro trial"
    : isSubscribed
      ? "You are currently on the Pro plan"
      : hasTrialExpired
        ? "Unlock all features with our Pro plan"
        : "Try Pro free for 14 days, no credit card required";

  return (
    <SettingsSubsection title="Plan" description={description}>
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center">
            <Check className="mr-2 h-4 w-4 text-green-500" />
            <span>Automatic account tracking for banks, investments, crypto & more</span>
          </div>
          <div className="flex items-center">
            <Check className="mr-2 h-4 w-4 text-green-500" />
            <span>Unlimited AI Advisor & other upcoming AI features</span>
          </div>
          <div className="flex items-center">
            <Check className="mr-2 h-4 w-4 text-green-500" />
            <span>Priority support & founder phone number</span>
          </div>
        </div>
        {isTrialing ? (
          <p className="text-sm text-muted-foreground">
            Your trial ends on{" "}
            {trialEnd?.toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        ) : isSubscribed ? (
          <p className="text-sm text-muted-foreground">
            Your subscription will renew on{" "}
            {periodEnd?.toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium">€7.99/month after your trial ends</p>
            <p className="text-xs text-muted-foreground">
              Cancel anytime. No credit card required.
            </p>
          </div>
        )}
        {isSubscribed || isTrialing ? (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={portal.isPending}
            onClick={() => portal.mutate()}
          >
            {portal.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Manage subscription
          </Button>
        ) : (
          <Button
            type="button"
            className="w-full"
            disabled={upgrade.isPending}
            onClick={() => upgrade.mutate()}
          >
            {upgrade.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {hasTrialExpired ? "Upgrade to Pro" : "Start free trial"}
          </Button>
        )}
      </div>
    </SettingsSubsection>
  );
}
