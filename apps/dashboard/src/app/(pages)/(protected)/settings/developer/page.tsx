import { Separator } from "@/components/ui/separator";

import { ApiKeyForm } from "../api-key/api-key-form";
import { WebhookEndpointsForm } from "./webhook-endpoints-form";

export default function DeveloperPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Developer</h3>
        <p className="text-sm text-muted-foreground">
          Manage API keys and webhooks for programmatic access to your data.
        </p>
      </div>
      <Separator />
      <ApiKeyForm />
      <WebhookEndpointsForm />
    </div>
  );
}
