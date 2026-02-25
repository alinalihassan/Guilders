import { Separator } from "@/components/ui/separator";

import { CategoriesForm } from "./categories-form";

export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Categories</h3>
        <p className="text-sm text-muted-foreground">
          Manage your transaction categories for faster tagging and cleaner reports.
        </p>
      </div>
      <Separator />
      <CategoriesForm />
    </div>
  );
}
