"use client";

import { AccountsCard } from "@/components/dashboard/accounts/account-card";
import { CategoriesCard } from "@/components/dashboard/categories/categories-card";
import { NetWorthCard } from "@/components/dashboard/net-worth-card";
import { TransactionsCard } from "@/components/dashboard/transactions/transactions-card";

export default function DashboardPage() {
  return (
    <div className="grid gap-6 py-4">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <NetWorthCard className="col-span-1 md:col-span-3" />
        <CategoriesCard className="col-span-1 md:col-span-2" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="col-span-1 md:col-span-3">
          <AccountsCard className="h-[400px]" />
        </div>
        <div className="col-span-1 md:col-span-2">
          <TransactionsCard className="h-[400px]" />
        </div>
      </div>
    </div>
  );
}
