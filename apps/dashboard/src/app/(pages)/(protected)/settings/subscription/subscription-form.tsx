import { Check, Loader2 } from "lucide-react";

import { SettingsSubsection } from "@/components/settings/settings-subsection";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBillingConfig } from "@/lib/queries/useBilling";
import { usePortalSession, useSubscription } from "@/lib/queries/useSubscription";
import { useUser } from "@/lib/queries/useUser";

export function SubscriptionForm() {
  const { data: user, isLoading } = useUser();
  const { data: billing, isPending: billingConfigPending } = useBillingConfig();
  const upgrade = useSubscription();
  const portal = usePortalSession();

  if (isLoading || billingConfigPending) {
    return (
      <SettingsSubsection>
        <div className="space-y-4">
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 shrink-0 rounded" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-10 w-44" />
        </div>
      </SettingsSubsection>
    );
  }

  const billingEnabledResolved = billing?.billingEnabled ?? true;
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
    <SettingsSubsection description={description}>
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
            disabled={!billingEnabledResolved || portal.isPending}
            onClick={() => portal.mutate()}
          >
            {portal.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Opening...
              </>
            ) : (
              "Manage subscription"
            )}
          </Button>
        ) : (
          <Button
            type="button"
            disabled={!billingEnabledResolved || upgrade.isPending}
            onClick={() => upgrade.mutate()}
          >
            {upgrade.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : hasTrialExpired ? (
              "Upgrade to Pro"
            ) : (
              "Start free trial"
            )}
          </Button>
        )}
        {!billingEnabledResolved && (
          <p className="text-sm text-muted-foreground">
            Billing is not configured on this server. All features are included.
          </p>
        )}
      </div>
    </SettingsSubsection>
  );
}
