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
        <p className="mt-1 text-sm text-muted-foreground">
          Click a name to edit, click the color to change it. Drag to reparent. Income and expense
          are separate; drop in the right section to change type.
        </p>
      </div>
      <Separator />
      <CategoriesForm />
    </div>
  );
}
