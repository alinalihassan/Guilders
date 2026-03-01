"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useDialog } from "@/hooks/useDialog";
import { env } from "@/lib/env";
import { queryKey as accountsQueryKey } from "@/lib/queries/useAccounts";
import { queryKey as transactionsQueryKey } from "@/lib/queries/useTransactions";

const TELLER_ORIGIN = "https://teller.io";

function isTellerConnectUrl(url: string) {
  try {
    return new URL(url).origin === TELLER_ORIGIN;
  } catch {
    return false;
  }
}

function prepareTellerUrl(url: string): string {
  const parsed = new URL(url);
  parsed.searchParams.set("origin", window.origin);
  parsed.searchParams.set("loader_id", "load_" + Math.random().toString(32).substring(2));
  return parsed.toString();
}

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

    if (providerData.redirectType === "redirect") {
      window.open(providerData.redirectUri, "_blank");
    }

    const isTeller =
      providerData.redirectType === "popup" && isTellerConnectUrl(providerData.redirectUri);

    const handleMessageEvent = (e: MessageEvent) => {
      if (isTeller && e.origin === TELLER_ORIGIN) {
        // oxlint-disable-next-line typescript/no-explicit-any: TODO
        let data: any;
        try {
          data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        } catch {
          return;
        }
        if (data?.namespace !== "teller-connect") return;

        if (data.event === "exit") {
          close();
          return;
        }

        if (data.event === "success") {
          const accessToken = data.data?.accessToken;
          const enrollmentId = data.data?.enrollment?.id;
          const callbackUrl = new URL(providerData.redirectUri).searchParams.get("callback");

          if (iframeRef.current && callbackUrl && accessToken && enrollmentId) {
            const url = new URL(callbackUrl);
            url.searchParams.set("access_token", accessToken);
            url.searchParams.set("enrollment_id", enrollmentId);
            iframeRef.current.src = url.toString();
            // Invalidate queries to refresh accounts/transactions after Teller connect
            queryClient.invalidateQueries({ queryKey: accountsQueryKey });
            queryClient.invalidateQueries({ queryKey: transactionsQueryKey });
          }
        }

        return;
      }

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
      } else if (
        e.origin === new URL(env.NEXT_PUBLIC_NGROK_URL ?? env.NEXT_PUBLIC_API_URL).origin
      ) {
        const { stage } = e.data;
        if (!stage) return;

        close();
        if (stage === "success") {
          toast.success("Success", {
            description: successDescription,
          });

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
  }, [close, providerData, queryClient]);

  if (!isOpen || !providerData) return null;

  const isTeller =
    providerData.redirectType === "popup" && isTellerConnectUrl(providerData.redirectUri);
  const iframeSrc = isTeller
    ? prepareTellerUrl(providerData.redirectUri)
    : providerData.redirectUri;

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogTitle className="hidden">Provider Dialog</DialogTitle>
      <DialogContent showCloseIcon={false} className="h-[70vh] p-0 sm:max-w-[500px]">
        <DialogDescription className="hidden">Provider Connection Dialog</DialogDescription>
        {providerData.redirectType === "popup" ? (
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            title="Provider Connection Dialog"
            className={`h-full w-full rounded-lg border-none ${isTeller ? "p-0" : "p-16"}`}
            allow="clipboard-read *; clipboard-write *"
            sandbox="allow-forms allow-scripts allow-popups allow-popups-to-escape-sandbox allow-same-origin"
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
