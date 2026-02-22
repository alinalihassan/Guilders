"use client";

import { useDialog } from "@/lib/hooks/useDialog";
import { useSecurityStore } from "@/lib/store/securityStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";

export function MFADialog() {
  const { isOpen, close } = useDialog("mfa");
  const [isLoading] = useState(false);
  const checkMFAStatus = useSecurityStore((state) => state.checkMFAStatus);

  const handleClose = () => {
    close();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Setup Authenticator App</DialogTitle>
          <DialogDescription>
            MFA setup is currently unavailable while we migrate authentication
            flows to Better Auth.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">MVP</Badge>
            <h3 className="font-medium">Deferred Feature</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            We will re-enable MFA once Better Auth 2FA flows are fully wired.
          </p>
          <Button
            onClick={async () => {
              await checkMFAStatus();
              toast.message("MFA is not available yet.");
              handleClose();
            }}
            disabled={isLoading}
            className="w-full"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
