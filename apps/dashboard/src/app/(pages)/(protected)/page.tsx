import { createFileRoute } from "@tanstack/react-router";

import { AccountsCard } from "@/components/dashboard/accounts/account-card";
import { CategoriesCard } from "@/components/dashboard/categories/categories-card";
import { NetWorthCard } from "@/components/dashboard/net-worth-card";
import { TransactionsCard } from "@/components/dashboard/transactions/transactions-card";

export const Route = createFileRoute("/(pages)/(protected)/")({
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <div className="grid gap-6 py-4">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-9">
        <NetWorthCard className="col-span-1 min-h-[420px] md:col-span-5" />
        <CategoriesCard className="col-span-1 min-h-[420px] md:col-span-4" />
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-9">
        <AccountsCard className="col-span-1 h-[420px] md:col-span-5" />
        <TransactionsCard className="col-span-1 h-[420px] md:col-span-4" />
      </div>
    </div>
  );
}
