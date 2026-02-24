"use client";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function ConnectionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Connections</h3>
        <p className="text-sm text-muted-foreground">Manage your connections.</p>
      </div>
      <Separator />
      <Card className="p-6">
        <div className="space-y-2">
          <h4 className="font-medium">Connection management is in app flows</h4>
          <p className="text-sm text-muted-foreground">
            Create new provider connections from the command menu (`Add Account` → `Add Synced
            Account`). Existing synced accounts can be refreshed or fixed from their account detail
            and edit dialogs.
          </p>
        </div>
      </Card>
    </div>
  );
}
