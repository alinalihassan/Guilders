"use client";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function ConnectionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Connections</h3>
        <p className="text-sm text-muted-foreground">
          Manage your connections.
        </p>
      </div>
      <Separator />
      <Card className="p-6">
        <div className="space-y-2">
          <h4 className="font-medium">Connections are temporarily unavailable</h4>
          <p className="text-sm text-muted-foreground">
            Provider connection management has not been migrated to the new API
            yet. Core dashboard features remain available.
          </p>
        </div>
      </Card>
    </div>
  );
}
