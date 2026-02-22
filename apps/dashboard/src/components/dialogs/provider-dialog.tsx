"use client";

import { env } from "@/lib/env";
import { useDialog } from "@/lib/hooks/useDialog";
import { queryKey as accountsQueryKey } from "@/lib/queries/useAccounts";
import { queryKey as transactionsQueryKey } from "@/lib/queries/useTransactions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

export function ProviderDialog() {
  const { isOpen, data, close } = useDialog("provider");
  const queryClient = useQueryClient();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const successToast = {
    title: "Success",
    description: data
      ? `You have successfully ${
          data.operation === "connect" ? "connected" : "fixed the connection"
        } to the institution!`
      : "",
  };

  const errorToast = {
    title: "Error",
    description: data
      ? `There was an error ${
          data.operation === "connect" ? "connecting" : "fixing the connection"
        } to the institution.`
      : "",
  };

  useEffect(() => {
    if (!data) return;

    if (data.redirectType === "popup") {
      const handleMessageEvent = (e: MessageEvent) => {
        if (e.origin === "https://app.snaptrade.com") {
          if (e.data) {
            const data = e.data;
            if (data.status === "SUCCESS") {
              close();
              toast.success(successToast.title, {
                description: successToast.description,
              });
            }
            if (data.status === "ERROR") {
              toast.error(errorToast.title, {
                description: errorToast.description,
              });
              close();
            }
            if (
              data === "CLOSED" ||
              data === "CLOSE_MODAL" ||
              data === "ABANDONED"
            ) {
              close();
            }
          }
        } else if (
          e.origin === env.NEXT_PUBLIC_API_URL ||
          e.origin === env.NEXT_PUBLIC_NGROK_URL
        ) {
          const { stage } = e.data;
          if (!stage) return;

          close();
          if (stage === "success") {
            toast.success(successToast.title, {
              description: successToast.description,
            });

            // Refresh both accounts and transactions data
            queryClient.invalidateQueries({ queryKey: accountsQueryKey });
            queryClient.invalidateQueries({ queryKey: transactionsQueryKey });
          } else if (stage === "error") {
            toast.error(errorToast.title, {
              description: errorToast.description,
            });
          }
        }
      };

      window.addEventListener("message", handleMessageEvent, false);
      return () =>
        window.removeEventListener("message", handleMessageEvent, false);
    }

    if (data.redirectType === "redirect") {
      window.open(data.redirectUri, "_blank");
    }
  }, [close, queryClient, toast, successToast, errorToast, data]);

  if (!isOpen || !data) return null;

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogTitle className="hidden">Provider Dialog</DialogTitle>
      <DialogContent
        showCloseIcon={false}
        className="sm:max-w-[600px] h-[80vh] p-0"
      >
        <DialogDescription className="hidden">
          Provider Connection Dialog
        </DialogDescription>
        {data.redirectType === "popup" ? (
          <iframe
            ref={iframeRef}
            src={data.redirectUri}
            title="Provider Connection Dialog"
            className="w-full h-full border-none rounded-lg"
            allow="clipboard-read *; clipboard-write *"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-6 space-y-4 text-center">
            <h3 className="text-lg font-semibold">
              Please Complete Authorization
            </h3>
            <p className="text-muted-foreground">
              We've opened a new tab where you can complete the connection
              process. Please return to this window once you're done. Feel free
              to close this popup once you're done.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
