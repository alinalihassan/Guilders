import { createFileRoute } from "@tanstack/react-router";

import { Separator } from "@/components/ui/separator";

import { RulesForm } from "./rules-form";

export const Route = createFileRoute("/(pages)/(protected)/settings/rules/")({
  component: RulesPage,
});

function RulesPage() {
  return (
    <div className="space-y-6 lg:w-[min(56rem,calc(100%+14rem))] lg:max-w-none">
      <div>
        <h3 className="text-lg font-medium">Rules</h3>
        <p className="text-muted-foreground text-sm">
          Automatically categorize, tag, and rename transactions when they match conditions.
        </p>
      </div>
      <Separator />
      <RulesForm />
    </div>
  );
}
