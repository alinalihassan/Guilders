import { createFileRoute } from "@tanstack/react-router";

import { Separator } from "@/components/ui/separator";

import { MerchantsForm } from "./merchants-form";

export const Route = createFileRoute("/(pages)/(protected)/settings/merchants/")({
  component: MerchantsPage,
});

function MerchantsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Merchants</h3>
        <p className="text-sm text-muted-foreground">
          Manage your merchants for faster data entry and cleaner reports.
        </p>
      </div>
      <Separator />
      <MerchantsForm />
    </div>
  );
}
