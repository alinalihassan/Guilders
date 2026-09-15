import { Landmark, SquarePen } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDialog } from "@/hooks/useDialog";

export function AddAccountChooserDialog() {
  const { isOpen, close } = useDialog("addAccount");
  const { open: openConnectBank } = useDialog("connectBank");
  const { open: openManualAccount } = useDialog("addManualAccount");

  const handleConnectBank = () => {
    close();
    setTimeout(() => openConnectBank(), 40);
  };

  const handleManualAccount = () => {
    close();
    setTimeout(() => openManualAccount(), 40);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add account</DialogTitle>
          <DialogDescription>
            Connect a bank or brokerage, or add an account manually.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 pt-2">
          <button
            type="button"
            onClick={handleConnectBank}
            className="border-border hover:bg-muted/50 flex items-start gap-4 rounded-lg border p-4 text-left transition-colors"
          >
            <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg">
              <Landmark className="text-foreground size-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium">Connect a bank</p>
              <p className="text-muted-foreground text-sm">
                Sync balances and transactions from your bank or brokerage.
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={handleManualAccount}
            className="border-border hover:bg-muted/50 flex items-start gap-4 rounded-lg border p-4 text-left transition-colors"
          >
            <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg">
              <SquarePen className="text-foreground size-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium">Add manual account</p>
              <p className="text-muted-foreground text-sm">
                Track cash, property, vehicles, or other accounts yourself.
              </p>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
