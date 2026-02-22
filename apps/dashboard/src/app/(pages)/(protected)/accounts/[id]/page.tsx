"use client";

import { AccountsCard } from "@/components/dashboard/accounts/account-card";
import { AccountIcon } from "@/components/dashboard/accounts/account-icon";
import { BalanceCard } from "@/components/dashboard/balance-card";
import { TransactionsCard } from "@/components/dashboard/transactions/transactions-card";
import { useRefreshConnection } from "@/lib/queries/useConnections";
import { useDialog } from "@/lib/hooks/useDialog";
import { useAccount, useRemoveAccount } from "@/lib/queries/useAccounts";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { MoreHorizontal, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { toast } from "sonner";

export default function AccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: account, isLoading } = useAccount(Number.parseInt(id));
  const [imageError, setImageError] = useState(false);
  const { open: openEdit } = useDialog("editAccount");
  const { open: openConfirmation } = useDialog("confirmation");
  const { mutate: removeAccount, isPending: isDeleting } = useRemoveAccount();
  const { mutate: refreshConnection, isPending: isRefreshing } =
    useRefreshConnection();
  const router = useRouter();

  const change = {
    value: account?.cost ? account.value - account.cost : 0,
    percentage: account?.cost
      ? (account.value - account.cost) / account.cost
      : 0,
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
      description:
        "Are you sure you want to delete this account? This action cannot be undone.",
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

    refreshConnection(
      {
        providerId: account.institution_connection?.provider?.id.toString() || "",
        connectionId: account.institution_connection_id.toString(),
      },
      {
        onSuccess: () => {
          toast.success("Account refresh queued");
        },
        onError: (error) => {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to refresh connection",
          );
        },
      },
    );
  };

  return (
    <>
      {isLoading ? (
        <div className="p-4 space-y-4">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      ) : !account ? (
        <div className="p-4">
          <p>Account not found</p>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <AccountIcon
              account={account}
              width={40}
              height={40}
              hasImageError={imageError}
              onImageError={() => setImageError(true)}
            />
            <div className="flex-1 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  {account.name}
                </h1>
                {account.institution_connection?.institution?.name && (
                  <p className="text-sm text-muted-foreground">
                    {account.institution_connection.institution.name}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {account.institution_connection_id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                    />
                    <span className="sr-only">Refresh connection</span>
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

          <BalanceCard
            title={account.subtype === "depository" ? "Balance" : "Value"}
            value={account.value}
            currency={account.currency}
            change={change}
          />

          {account.subtype === "depository" ? (
            // biome-ignore lint/complexity/noUselessFragments: Using it to override the default menu component
            <TransactionsCard accountId={account.id} menuComponent={<></>} />
          ) : null}
          {account.subtype === "brokerage" &&
          (account.children?.length ?? 0) > 0 ? (
            <AccountsCard
              title="Holdings"
              accounts={account.children}
              // biome-ignore lint/complexity/noUselessFragments: Using it to override the default menu component
              menuComponent={<></>}
            />
          ) : null}
        </div>
      )}
    </>
  );
}
