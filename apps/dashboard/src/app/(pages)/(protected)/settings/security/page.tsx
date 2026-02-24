import { Separator } from "@/components/ui/separator";

import { SecurityForm } from "./security-form";

export default function SecurityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Security</h3>
        <p className="text-sm text-muted-foreground">Manage your security settings.</p>
      </div>
      <Separator />
      <SecurityForm />
    </div>
  );
}
