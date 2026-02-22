"use client";

import { useDialog } from "@/lib/hooks/useDialog";
import { useProviderById } from "@/lib/queries/useProviders";
import { useUser } from "@/lib/queries/useUser";
import { isPro } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Image from "next/image";
import { useRouter } from "next/navigation";

export function AddLinkedAccountDialog() {
  const router = useRouter();
  const { data: user } = useUser();
  const { isOpen, data, close } = useDialog("addLinkedAccount");
  const provider = useProviderById(data?.institution?.provider_id);

  if (!isOpen || !provider || !data?.institution) return null;
  const { institution } = data;
  const isSubscribed = isPro(user);

  const onContinue = async () => {
    if (!isSubscribed) router.push("/settings/subscription");
    close();
  };

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogTitle className="hidden">Add Linked Account</DialogTitle>
      <DialogContent className="sm:max-w-[425px]">
        <DialogDescription className="hidden">
          This connection is provided by {provider.name}. By clicking continue,
          you authorize {provider.name} to establish the connection and access
          your financial data.
        </DialogDescription>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Image
              src={institution.logo_url}
              alt={`${institution.name} logo`}
              width={40}
              height={40}
              className="object-contain w-[40px] h-[40px]"
            />
            <h2 className="text-2xl font-semibold">{institution.name}</h2>
          </div>
        </DialogHeader>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span>Powered by</span>
            <Image
              src={provider.logo_url}
              alt={`${provider.name} logo`}
              width={96}
              height={24}
              className="object-contain w-[96px] h-[24px]"
            />
          </div>

          <p className="text-muted-foreground text-sm">
            {isSubscribed ? (
              <>
                Connection setup is temporarily unavailable while provider
                callbacks are being migrated.
              </>
            ) : (
              <>
                This feature requires a Pro subscription. Click continue to
                upgrade your account and unlock automatic account tracking.
              </>
            )}
          </p>
        </div>

        <Button onClick={onContinue}>
          {isSubscribed ? "Close" : "Upgrade to Pro"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
