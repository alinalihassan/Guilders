import { createFileRoute } from "@tanstack/react-router";

import { Separator } from "@/components/ui/separator";

import { AccountForm } from "./account-form";

export const Route = createFileRoute("/(pages)/(protected)/settings/account/")({
  component: AccountPage,
});

function AccountPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Account</h3>
        <p className="text-sm text-muted-foreground">Manage your account settings.</p>
      </div>
      <Separator />
      <AccountForm />
    </div>
  );
}
