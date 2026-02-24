"use client";

import { Plus } from "lucide-react";
import { AccountsCard } from "@/components/dashboard/accounts/account-card";
import { AccountsEmptyPlaceholder } from "@/components/dashboard/accounts/accounts-placeholder";
import { CompactBalanceCard } from "@/components/dashboard/compact-balance-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDialog } from "@/lib/hooks/useDialog";
import { useAccounts } from "@/lib/queries/useAccounts";

export default function AccountsPage() {
	const { data: accounts, isLoading, error } = useAccounts();
	const { open: openAddAccount } = useDialog("addManualAccount");

	const topLevelAccounts =
		accounts?.filter(
			(account) => (account as { parent?: number | null }).parent == null,
		) ?? [];
	const assets = topLevelAccounts.filter((account) => account.type === "asset");
	const liabilities = topLevelAccounts.filter(
		(account) => account.type === "liability",
	);

	return (
		<div className="py-4">
			<div className="flex items-center justify-between mb-4">
				<h1 className="text-2xl font-semibold text-foreground">Accounts</h1>
				<Button onClick={() => openAddAccount()} size="sm">
					<Plus className="h-4 w-4" />
					Add Account
				</Button>
			</div>

			{isLoading ? (
				<div className="space-y-4">
					<Skeleton className="h-[400px] w-full" />
					<Skeleton className="h-[400px] w-full" />
				</div>
			) : error ? (
				<div className="text-center py-8">
					<p className="mb-4">
						Error loading accounts. Please try again later.
					</p>
				</div>
			) : !accounts || accounts.length === 0 ? (
				<AccountsEmptyPlaceholder />
			) : (
				<div className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<CompactBalanceCard title="Assets" accounts={assets} />
						<CompactBalanceCard
							title="Liabilities"
							accounts={liabilities}
							invertColors
						/>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<AccountsCard
							className="h-[500px]"
							title="Assets"
							accounts={assets}
							// biome-ignore lint/complexity/noUselessFragments: Using it to override the default menu component
							menuComponent={<></>}
						/>
						<AccountsCard
							className="h-[500px]"
							title="Liabilities"
							accounts={liabilities}
							// biome-ignore lint/complexity/noUselessFragments: Using it to override the default menu component
							menuComponent={<></>}
						/>
					</div>
				</div>
			)}
		</div>
	);
}
