import { createFileRoute } from "@tanstack/react-router";

import { Separator } from "@/components/ui/separator";

import { SubscriptionForm } from "./subscription-form";

export const Route = createFileRoute("/(pages)/(protected)/settings/subscription/")({
  component: SubscriptionPage,
});

function SubscriptionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Subscription</h3>
        <p className="text-sm text-muted-foreground">Manage your subscription plan and billing.</p>
      </div>
      <Separator />
      <SubscriptionForm />
    </div>
  );
}
