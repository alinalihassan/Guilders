"use client";

import { createFileRoute } from "@tanstack/react-router";
import { Plus, XCircle } from "lucide-react";

import { AccountsCard } from "@/components/dashboard/accounts/account-card";
import { AccountsEmptyPlaceholder } from "@/components/dashboard/accounts/accounts-placeholder";
import { CompactBalanceCard } from "@/components/dashboard/compact-balance-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDialog } from "@/hooks/useDialog";
import { useAccounts } from "@/lib/queries/useAccounts";

export const Route = createFileRoute("/(pages)/(protected)/accounts/")({
  component: AccountsPage,
});

function AccountsPage() {
  const { data: accounts, isLoading, error } = useAccounts();
  const { open: openAddAccount } = useDialog("addManualAccount");

  const topLevelAccounts =
    accounts?.filter((account) => (account as { parent?: number | null }).parent == null) ?? [];
  const assetAccounts = topLevelAccounts.filter((account) => account.type === "asset");
  const liabilities = topLevelAccounts.filter((account) => account.type === "liability");

  return (
    <div className="py-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Accounts</h1>
        <Button onClick={() => openAddAccount()} size="sm">
          <Plus className="h-4 w-4" />
          Add Account
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="flex gap-4 p-6">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-[80px] w-32 shrink-0 rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-9 w-24 rounded-md" />
                </CardHeader>
                <CardContent className="min-h-0 flex-1 space-y-2">
                  {Array.from({ length: 5 }).map((_row, j) => (
                    <Skeleton key={j} className="h-10 w-full" />
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : error ? (
        <Card className="p-6">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="rounded-full bg-destructive/10 p-3">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Failed to load accounts</h4>
              <p className="text-sm text-muted-foreground">
                There was an error loading your accounts. Please try again later.
              </p>
            </div>
          </div>
        </Card>
      ) : !accounts || accounts.length === 0 ? (
        <AccountsEmptyPlaceholder />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <CompactBalanceCard title="Assets" accounts={assetAccounts} />
            <CompactBalanceCard title="Liabilities" accounts={liabilities} invertColors />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <AccountsCard
              className="h-[500px]"
              title="Assets"
              accounts={assetAccounts}
              menuComponent={<></>}
            />
            <AccountsCard
              className="h-[500px]"
              title="Liabilities"
              accounts={liabilities}
              menuComponent={<></>}
            />
          </div>
        </div>
      )}
    </div>
  );
}
