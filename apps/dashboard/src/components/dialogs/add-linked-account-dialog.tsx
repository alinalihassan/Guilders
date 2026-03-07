"use client";

import { useRouter } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDialog } from "@/hooks/useDialog";
import { useBillingConfig } from "@/lib/queries/useBilling";
import { useCreateConnection } from "@/lib/queries/useConnections";
import { useProviderById } from "@/lib/queries/useProviders";
import { useUser } from "@/lib/queries/useUser";
import { isPro } from "@/lib/utils";

export function AddLinkedAccountDialog() {
  const router = useRouter();
  const { data: user } = useUser();
  const { data: billing, isPending: billingConfigPending } = useBillingConfig();
  const { isOpen, data, close } = useDialog("addLinkedAccount");
  const { open: openProviderDialog } = useDialog("provider");
  const provider = useProviderById(data?.institution?.provider_id);
  const { mutateAsync: createConnection, isPending } = useCreateConnection();

  if (!isOpen || !provider || !data?.institution) return null;
  const { institution } = data;

  const billingConfigLoaded = !billingConfigPending;
  const billingReady = billingConfigLoaded && billing !== undefined;
  const billingEnabled = billingReady ? (billing.billingEnabled ?? true) : undefined;
  const isSubscribed =
    billingEnabled !== undefined ? !billingEnabled || isPro(user, billingEnabled) : false;

  const onContinue = async () => {
    if (!billingReady) {
      toast.error("Subscription status is still loading. Please wait and try again.");
      return;
    }
    if (!isSubscribed) {
      router.navigate({ to: "/settings/subscription" });
      close();
      return;
    }

    const { redirectURI, type: redirectType } = await createConnection({
      providerId: provider.id.toString(),
      institutionId: institution.id.toString(),
    });

    if (redirectURI) {
      close();
      openProviderDialog({
        redirectUri: redirectURI,
        operation: "connect",
        redirectType,
      });
      return;
    }

    close();
    toast.error("Failed to create connection", {
      description: "Unable to create connection. Please try again later.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogTitle className="hidden">Add Linked Account</DialogTitle>
      <DialogContent className="sm:max-w-[425px]">
        <DialogDescription className="hidden">
          This connection is provided by {provider.name}. By clicking continue, you authorize{" "}
          {provider.name} to establish the connection and access your financial data.
        </DialogDescription>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <img
              src={institution.logo_url}
              alt={`${institution.name} logo`}
              width={40}
              height={40}
              className="h-[40px] w-[40px] object-contain"
            />
            <h2 className="text-2xl font-semibold">{institution.name}</h2>
          </div>
        </DialogHeader>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span>Powered by</span>
            <img
              src={provider.logo_url}
              alt={`${provider.name} logo`}
              width={96}
              height={24}
              className="h-[24px] w-[96px] object-contain"
            />
          </div>

          <p className="text-sm text-muted-foreground">
            {!billingReady ? (
              <>Checking subscription status…</>
            ) : isSubscribed ? (
              <>
                This connection is provided by {provider.name}. By clicking continue, you authorize{" "}
                {provider.name} to establish the connection and access your financial data.
              </>
            ) : (
              <>
                This feature requires a Pro subscription. Click continue to upgrade your account and
                unlock automatic account tracking.
              </>
            )}
          </p>
        </div>
        {isPending ? (
          <Button disabled>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Please wait
          </Button>
        ) : !billingReady ? (
          <Button disabled>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading…
          </Button>
        ) : (
          <Button onClick={onContinue}>{isSubscribed ? "Continue" : "Upgrade to Pro"}</Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
