"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { env } from "@/lib/env";
import { useDialog } from "@/lib/hooks/useDialog";
import { queryKey as accountsQueryKey } from "@/lib/queries/useAccounts";
import { queryKey as transactionsQueryKey } from "@/lib/queries/useTransactions";

export function ProviderDialog() {
  const { isOpen, data: providerData, close } = useDialog("provider");
  const queryClient = useQueryClient();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!providerData) return;

    const successDescription = `You have successfully ${
      providerData.operation === "connect" ? "connected" : "fixed the connection"
    } to the institution!`;
    const errorDescription = `There was an error ${
      providerData.operation === "connect" ? "connecting" : "fixing the connection"
    } to the institution.`;

    if (providerData.redirectType === "popup") {
      const handleMessageEvent = (e: MessageEvent) => {
        if (e.origin === "https://app.snaptrade.com") {
          if (e.data) {
            const snaptradeEventData = e.data;
            if (snaptradeEventData.status === "SUCCESS") {
              close();
              toast.success("Success", {
                description: successDescription,
              });
            }
            if (snaptradeEventData.status === "ERROR") {
              toast.error("Error", {
                description: errorDescription,
              });
              close();
            }
            if (
              snaptradeEventData === "CLOSED" ||
              snaptradeEventData === "CLOSE_MODAL" ||
              snaptradeEventData === "ABANDONED"
            ) {
              close();
            }
          }
        } else if (e.origin === env.NEXT_PUBLIC_API_URL || e.origin === env.NEXT_PUBLIC_NGROK_URL) {
          const { stage } = e.data;
          if (!stage) return;

          close();
          if (stage === "success") {
            toast.success("Success", {
              description: successDescription,
            });

            // Refresh both accounts and transactions data
            queryClient.invalidateQueries({ queryKey: accountsQueryKey });
            queryClient.invalidateQueries({ queryKey: transactionsQueryKey });
          } else if (stage === "error") {
            toast.error("Error", {
              description: errorDescription,
            });
          }
        }
      };

      window.addEventListener("message", handleMessageEvent, false);
      return () => window.removeEventListener("message", handleMessageEvent, false);
    }

    if (providerData.redirectType === "redirect") {
      window.open(providerData.redirectUri, "_blank");
    }
  }, [close, providerData, queryClient]);

  if (!isOpen || !providerData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogTitle className="hidden">Provider Dialog</DialogTitle>
      <DialogContent showCloseIcon={false} className="h-[80vh] p-0 sm:max-w-[600px]">
        <DialogDescription className="hidden">Provider Connection Dialog</DialogDescription>
        {providerData.redirectType === "popup" ? (
          <iframe
            ref={iframeRef}
            src={providerData.redirectUri}
            title="Provider Connection Dialog"
            className="h-full w-full rounded-lg border-none"
            allow="clipboard-read *; clipboard-write *"
            sandbox="allow-forms allow-scripts allow-popups allow-popups-to-escape-sandbox"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center space-y-4 p-6 text-center">
            <h3 className="text-lg font-semibold">Please Complete Authorization</h3>
            <p className="text-muted-foreground">
              We've opened a new tab where you can complete the connection process. Please return to
              this window once you're done. Feel free to close this popup once you're done.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
