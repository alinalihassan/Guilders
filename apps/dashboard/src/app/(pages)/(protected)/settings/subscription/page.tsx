import { Separator } from "@/components/ui/separator";
import { SubscriptionForm } from "./subscription-form";

export default function SubscriptionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Subscription</h3>
        <p className="text-sm text-muted-foreground">
          Manage your subscription plan and billing.
        </p>
      </div>
      <Separator />
      <SubscriptionForm />
    </div>
  );
}
