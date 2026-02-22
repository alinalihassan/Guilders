import { useDialog } from "@/lib/hooks/useDialog";
import { Button } from "@/components/ui/button";
import { BadgeEuro } from "lucide-react";

export function AccountsEmptyPlaceholder() {
  const { open } = useDialog("addManualAccount");

  return (
    <div className="flex shrink-0 items-center justify-center rounded-md p-4">
      <div className="mx-auto flex flex-col items-center justify-center text-center">
        <BadgeEuro className="h-10 w-10 text-muted-foreground" />

        <h3 className="mt-4 text-lg font-semibold">No accounts added</h3>
        <p className="mb-4 mt-2 text-sm text-muted-foreground">
          You have not added any accounts.
        </p>

        <Button size="sm" className="relative" onClick={() => open()}>
          Add Account
        </Button>
      </div>
    </div>
  );
}
