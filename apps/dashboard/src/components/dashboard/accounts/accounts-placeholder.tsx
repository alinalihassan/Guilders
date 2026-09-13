import { BadgeEuro } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDialog } from "@/hooks/useDialog";

export function AccountsEmptyPlaceholder() {
  const { open } = useDialog("addManualAccount");

  return (
    <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center py-8 text-center">
      <BadgeEuro className="mb-3 h-6 w-6 opacity-50" />
      <p className="text-sm">Add accounts to see them here.</p>
      <Button size="sm" className="mt-4" onClick={() => open()}>
        Add Account
      </Button>
    </div>
  );
}
