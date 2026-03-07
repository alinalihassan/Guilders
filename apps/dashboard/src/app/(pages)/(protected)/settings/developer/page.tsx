import { createFileRoute } from "@tanstack/react-router";

import { SettingsSubsection } from "@/components/settings/settings-subsection";
import { Separator } from "@/components/ui/separator";

import { ApiKeysSection } from "./api-keys-section";
import { WebhooksSection } from "./webhooks-section";

export const Route = createFileRoute("/(pages)/(protected)/settings/developer/")({
  component: DeveloperPage,
});

function DeveloperPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Developer</h3>
        <p className="text-sm text-muted-foreground">
          Manage API keys and webhooks for programmatic access to your data.
        </p>
      </div>
      <Separator />
      <div className="space-y-8">
        <SettingsSubsection
          title="API keys"
          description="Use API keys to access your data programmatically. Store generated keys securely because they are shown only once."
        >
          <ApiKeysSection />
        </SettingsSubsection>
        <SettingsSubsection
          title="Webhooks"
          description="Receive events when your accounts, transactions, or categories change. Add a URL to receive POST requests with a signed payload."
        >
          <WebhooksSection />
        </SettingsSubsection>
      </div>
    </div>
  );
}
