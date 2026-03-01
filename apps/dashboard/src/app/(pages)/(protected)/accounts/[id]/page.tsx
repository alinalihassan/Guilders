"use client";

import { Link2, MoreHorizontal, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useState } from "react";

import { AccountHoldingsDonutCard } from "@/components/dashboard/account-holdings-donut-card";
import { AccountsCard } from "@/components/dashboard/accounts/account-card";
import { AccountIcon } from "@/components/dashboard/accounts/account-icon";
import { BalanceCard } from "@/components/dashboard/balance-card";
import { TransactionsCard } from "@/components/dashboard/transactions/transactions-card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useDialog } from "@/hooks/useDialog";
import { useAccount, useRemoveAccount } from "@/lib/queries/useAccounts";
import { useRefreshConnection, useSyncAccount } from "@/lib/queries/useConnections";

export default function AccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: account, isLoading } = useAccount(Number.parseInt(id, 10));
  const [imageError, setImageError] = useState(false);
  const { open: openEdit } = useDialog("editAccount");
  const { open: openConfirmation } = useDialog("confirmation");
  const { mutate: removeAccount, isPending: isDeleting } = useRemoveAccount();
  const { mutate: syncAccount, isPending: isSyncing } = useSyncAccount();
  const { mutateAsync: refreshConnection, isPending: isReconnecting } = useRefreshConnection();
  const { open: openProviderDialog } = useDialog("provider");
  const router = useRouter();
  const accountValue = Number(account?.value ?? 0);
  const accountCost = Number(account?.cost ?? 0);

  const change = {
    value: account?.cost ? accountValue - accountCost : 0,
    percentage: account?.cost ? (accountValue - accountCost) / accountCost : 0,
    currency: account?.currency || "EUR",
  };

  const handleEdit = () => {
    if (account) {
      openEdit({ account });
    }
  };

  const handleDelete = () => {
    if (!account) return;

    openConfirmation({
      title: "Delete Account",
      description: "Are you sure you want to delete this account? This action cannot be undone.",
      confirmText: "Delete Account",
      isLoading: isDeleting,
      onConfirm: () => {
        removeAccount(account.id, {
          onSuccess: () => {
            router.push("/accounts");
          },
        });
      },
    });
  };

  const handleRefresh = async () => {
    if (!account?.institution_connection_id) return;

    syncAccount({
      accountId: account.id.toString(),
    });
  };

  const handleReconnect = async () => {
    const providerId = account?.institutionConnection?.institution?.provider_id;
    const connectionId = account?.institution_connection_id;
    if (!providerId || !connectionId) return;

    const result = await refreshConnection({
      providerId: providerId.toString(),
      connectionId: connectionId.toString(),
    });

    if (result.redirectURI && result.type) {
      openProviderDialog({
        redirectUri: result.redirectURI,
        operation: "reconnect",
        redirectType: result.type,
      });
    }
  };

  return (
    <>
      {isLoading ? (
        <div className="space-y-4 p-4">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      ) : !account ? (
        <div className="p-4">
          <p>Account not found</p>
        </div>
      ) : (
        <div className="space-y-4 p-4">
          <div className="flex items-center gap-2">
            <AccountIcon
              account={account}
              width={40}
              height={40}
              hasImageError={imageError}
              onImageError={() => setImageError(true)}
            />
            <div className="flex flex-1 items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-foreground">{account.name}</h1>
                {account.institutionConnection?.institution?.name && (
                  <p className="text-sm text-muted-foreground">
                    {account.institutionConnection.institution.name}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {account.institution_connection_id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRefresh}
                    disabled={isSyncing}
                  >
                    <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
                    <span className="sr-only">Sync data</span>
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleEdit}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    {account.institution_connection_id && (
                      <DropdownMenuItem onClick={handleReconnect} disabled={isReconnecting}>
                        <Link2 className="mr-2 h-4 w-4" />
                        Reconnect
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={handleDelete}
                      className="text-destructive focus:text-destructive"
                      disabled={isDeleting}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
            <div className="min-w-0 sm:flex-[65]">
              <BalanceCard
                title={account.subtype === "depository" ? "Balance" : "Value"}
                value={accountValue}
                currency={account.currency}
                change={change}
                accountId={account.id}
                className="h-full"
              />
            </div>
            {account.children && account.children.length > 0 ? (
              <div className="min-w-[240px] sm:flex-[35]">
                <AccountHoldingsDonutCard holdings={account.children} className="h-full" />
              </div>
            ) : null}
          </div>

          {account.subtype === "depository" ? (
            <TransactionsCard accountId={account.id} menuComponent={<></>} />
          ) : null}
          {account.subtype === "brokerage" && (account.children?.length ?? 0) > 0 ? (
            <AccountsCard title="Holdings" accounts={account.children} menuComponent={<></>} />
          ) : null}
        </div>
      )}
    </>
  );
}
