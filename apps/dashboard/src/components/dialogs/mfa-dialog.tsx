"use client";

import { useState } from "react";
import QRCode from "react-qr-code";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useDialog } from "@/lib/hooks/useDialog";
import { useSecurityStore } from "@/lib/store/securityStore";

export function MFADialog() {
  const { isOpen, close } = useDialog("mfa");
  const { isLoadingMFA, setup, checkMFAStatus, startMFASetup, verifyMFASetup, clearMFASetup } =
    useSecurityStore();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const handleClose = () => {
    setPassword("");
    setCode("");
    setIsVerified(false);
    clearMFASetup();
    close();
  };

  const handleEnable = async () => {
    if (!password) return;
    try {
      await startMFASetup(password);
    } catch (error) {
      toast.error("Unable to start 2FA setup", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const handleVerify = async () => {
    if (!code) return;
    try {
      await verifyMFASetup(code);
      await checkMFAStatus();
      setIsVerified(true);
      toast.success("2FA enabled successfully.");
    } catch (error) {
      toast.error("Invalid verification code", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const copyBackupCodes = async () => {
    if (!setup?.backupCodes?.length) return;
    await navigator.clipboard.writeText(setup.backupCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const downloadBackupCodes = () => {
    if (!setup?.backupCodes?.length) return;
    const blob = new Blob([setup.backupCodes.join("\n")], {
      type: "text/plain;charset=utf-8",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "guilders-backup-codes.txt";
    document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(link.href);
    link.remove();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Setup Authenticator App</DialogTitle>
          <DialogDescription>
            Enable two-factor authentication using a TOTP authenticator app.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!setup ? (
            <>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Step 1</Badge>
                <h3 className="font-medium">Confirm your password</h3>
              </div>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Current password"
                autoComplete="current-password"
              />
              <Button
                onClick={handleEnable}
                disabled={isLoadingMFA || !password}
                className="w-full"
              >
                {isLoadingMFA ? "Initializing..." : "Continue"}
              </Button>
            </>
          ) : !isVerified ? (
            <>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Step 2</Badge>
                <h3 className="font-medium">Verify authenticator code</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Add this TOTP URI to your authenticator app, then enter a 6-digit code.
              </p>
              <div className="flex justify-center rounded-md border bg-white p-3">
                <QRCode value={setup.totpURI} size={180} />
              </div>
              <Input readOnly value={setup.totpURI} className="font-mono text-xs" />
              <Input
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                inputMode="numeric"
                autoComplete="one-time-code"
              />
              <Button
                onClick={handleVerify}
                disabled={isLoadingMFA || code.length < 6}
                className="w-full"
              >
                {isLoadingMFA ? "Verifying..." : "Verify & Enable"}
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Step 3</Badge>
                <h3 className="font-medium">Save your backup codes</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Store these codes in a safe place. Each code can be used once if you lose access to
                your authenticator app.
              </p>

              {setup.backupCodes.length > 0 && (
                <div className="space-y-3 rounded-md border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-medium">Backup Codes</h4>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={copyBackupCodes}>
                        {copied ? "Copied" : "Copy"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={downloadBackupCodes}
                      >
                        Download
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {setup.backupCodes.map((backupCode) => (
                      <code key={backupCode} className="rounded bg-muted px-2 py-1 text-xs">
                        {backupCode}
                      </code>
                    ))}
                  </div>
                </div>
              )}
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </>
          )}

          {!isVerified && (
            <Button
              variant="ghost"
              onClick={handleClose}
              disabled={isLoadingMFA}
              className="w-full"
            >
              Close
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
