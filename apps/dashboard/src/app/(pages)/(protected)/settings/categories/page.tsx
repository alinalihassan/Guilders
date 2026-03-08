import { createFileRoute } from "@tanstack/react-router";

import { Separator } from "@/components/ui/separator";

import { CategoriesForm } from "./categories-form";

export const Route = createFileRoute("/(pages)/(protected)/settings/categories/")({
  component: CategoriesPage,
});

function CategoriesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Categories</h3>
        <p className="text-sm text-muted-foreground">
          Manage your transaction categories for faster data entry and cleaner reports.
        </p>
      </div>
      <Separator />
      <CategoriesForm />
    </div>
  );
}
