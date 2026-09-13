import { createFileRoute } from "@tanstack/react-router";
import { Plus, XCircle } from "lucide-react";

import { AccountsCard } from "@/components/dashboard/accounts/account-card";
import { AccountsEmptyPlaceholder } from "@/components/dashboard/accounts/accounts-placeholder";
import { CompactBalanceCard } from "@/components/dashboard/compact-balance-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-medium tracking-tight">Accounts</h1>
        <Button onClick={() => openAddAccount()} size="sm">
          <Plus className="h-4 w-4" />
          Add Account
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="shadow-none">
                <CardContent className="flex flex-col gap-5 p-6">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-10 w-40" />
                  <Skeleton className="h-6 w-28 rounded-full" />
                  <Skeleton className="h-[160px] w-full rounded-xl" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="flex flex-col shadow-none">
                <CardContent className="flex flex-col gap-5 p-6">
                  <Skeleton className="h-3 w-20" />
                  {Array.from({ length: 5 }).map((_row, j) => (
                    <Skeleton key={j} className="h-9 w-full" />
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : error ? (
        <Card className="p-6 shadow-none">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="bg-destructive/10 rounded-full p-3">
              <XCircle className="text-destructive h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Failed to load accounts</h4>
              <p className="text-muted-foreground text-sm">
                There was an error loading your accounts. Please try again later.
              </p>
            </div>
          </div>
        </Card>
      ) : !accounts || accounts.length === 0 ? (
        <AccountsEmptyPlaceholder />
      ) : (
        <div className="grid gap-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <CompactBalanceCard title="Assets" accounts={assetAccounts} />
            <CompactBalanceCard title="Liabilities" accounts={liabilities} invertColors />
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <AccountsCard
              className="min-h-[420px]"
              title="Assets"
              accounts={assetAccounts}
              menuComponent={<></>}
            />
            <AccountsCard
              className="min-h-[420px]"
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
