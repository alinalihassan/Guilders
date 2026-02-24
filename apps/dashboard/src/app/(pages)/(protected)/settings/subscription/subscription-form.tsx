"use client";

import { Check } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/lib/queries/useUser";

export function SubscriptionForm() {
  const { data: user, isLoading } = useUser();

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

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          {isTrialing ? "Pro Trial" : isSubscribed ? "Pro Plan" : "Upgrade to Pro"}
        </CardTitle>
        <CardDescription>
          {isTrialing
            ? "You are currently on the Pro trial"
            : isSubscribed
              ? "You are currently on the Pro plan"
              : hasTrialExpired
                ? "Unlock all features with our Pro plan"
                : "Try Pro free for 14 days, no credit card required"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
      </CardContent>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground">
          Billing actions are temporarily unavailable while Stripe callbacks are being migrated to
          the new backend.
        </p>
      </CardContent>
    </Card>
  );
}
