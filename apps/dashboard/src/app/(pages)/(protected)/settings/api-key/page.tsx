import { Separator } from "@/components/ui/separator";

import { ApiKeyForm } from "./api-key-form";

export default function ApiKeyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">API Key</h3>
        <p className="text-sm text-muted-foreground">
          Manage your API key for programmatic access to your data.
        </p>
      </div>
      <Separator />
      <ApiKeyForm />
    </div>
  );
}
