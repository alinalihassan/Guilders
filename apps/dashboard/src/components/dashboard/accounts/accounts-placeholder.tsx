import { BadgeEuro } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDialog } from "@/hooks/useDialog";

export function AccountsEmptyPlaceholder() {
  const { open } = useDialog("addManualAccount");

  return (
    <div className="flex shrink-0 items-center justify-center rounded-md p-4">
      <div className="mx-auto flex flex-col items-center justify-center text-center">
        <BadgeEuro className="text-muted-foreground h-10 w-10" />

        <h3 className="mt-4 text-lg font-semibold">No accounts added</h3>
        <p className="text-muted-foreground mt-2 mb-4 text-sm">You have not added any accounts.</p>

        <Button size="sm" className="relative" onClick={() => open()}>
          Add Account
        </Button>
      </div>
    </div>
  );
}
