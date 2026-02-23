"use client";

import NumberFlow from "@number-flow/react";
import { Filter, Plus, Search } from "lucide-react";
import { useRef, useState } from "react";
import { TransactionItem } from "@/components/dashboard/transactions/transaction-item";
import { TransactionsCard } from "@/components/dashboard/transactions/transactions-card";
import { TransactionsEmptyPlaceholder } from "@/components/dashboard/transactions/transactions-placeholder";
import { TransactionsSankey } from "@/components/dashboard/transactions/transactions-sankey";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDialog } from "@/lib/hooks/useDialog";
import { useTransactions } from "@/lib/queries/useTransactions";
import { useUser } from "@/lib/queries/useUser";
import { cn } from "@/lib/utils";
import { convertToUserCurrency } from "@/lib/utils/financial";

function toFiniteNumber(value: unknown): number {
	const numberValue = typeof value === "number" ? value : Number(value);
	return Number.isFinite(numberValue) ? numberValue : 0;
}

function convertAmountSafely(
	amount: unknown,
	fromCurrency: string,
	userCurrency: string,
): number {
	const normalizedAmount = toFiniteNumber(amount);
	const convertedAmount = convertToUserCurrency(
		normalizedAmount,
		fromCurrency,
		[],
		userCurrency,
	);
	return Number.isFinite(convertedAmount) ? convertedAmount : 0;
}

export default function TransactionsPage() {
	const { data: transactions, isLoading } = useTransactions();
	const { data: user, isLoading: isLoadingUser } = useUser();
	const { open: openAddTransaction } = useDialog("addTransaction");
	const [searchQuery, setSearchQuery] = useState("");
	const searchInputRef = useRef<HTMLInputElement>(null);
	const userCurrency = user?.settings.currency ?? "EUR";

	const totalIncome =
		transactions?.reduce(
			(sum, t) => {
				const amount = toFiniteNumber(t.amount);
				if (amount <= 0) return sum;
				return sum + convertAmountSafely(amount, t.currency, userCurrency);
			},
			0,
		) ?? 0;

	const totalExpenses =
		transactions?.reduce(
			(sum, t) => {
				const amount = toFiniteNumber(t.amount);
				if (amount >= 0) return sum;
				return (
					sum + Math.abs(convertAmountSafely(amount, t.currency, userCurrency))
				);
			},
			0,
		) ?? 0;

	const totalTransactions = transactions?.length ?? 0;

	const filteredTransactions = transactions?.filter((transaction) => {
		const searchLower = searchQuery.toLowerCase();
		return (
			transaction.description?.toLowerCase().includes(searchLower) ||
			transaction.category?.toLowerCase().includes(searchLower) ||
			toFiniteNumber(transaction.amount).toString().includes(searchLower) ||
			transaction.currency.toLowerCase().includes(searchLower)
		);
	});

	const menuComponent = (
		<>
			<div className="relative flex-1 md:w-64 md:flex-none">
				<div
					className={cn(
						"relative flex w-full items-center",
						"rounded-md border border-input",
						"bg-background hover:bg-accent hover:text-accent-foreground",
						"ring-offset-background",
						"transition-colors",
						"focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
					)}
					onClick={() => searchInputRef.current?.focus()}
				>
					<Search className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
					<input
						ref={searchInputRef}
						type="text"
						placeholder="Search transactions..."
						className={cn(
							"flex w-full bg-transparent px-2 py-2 text-sm",
							"placeholder:text-muted-foreground",
							"focus:outline-none focus:ring-0",
							"disabled:cursor-not-allowed disabled:opacity-50",
						)}
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>
			</div>
			<Button variant="outline" size="icon" disabled>
				<Filter className="h-4 w-4" />
			</Button>
		</>
	);

	return (
		<div className="py-4 space-y-4">
			<div className="flex items-center justify-between mb-4">
				<h1 className="text-2xl font-semibold text-foreground">Transactions</h1>
				<Button onClick={() => openAddTransaction({})} size="sm">
					<Plus className="h-4 w-4" />
					Add Transaction
				</Button>
			</div>
			{/* Summary Cards */}
			<div className="grid gap-4 md:grid-cols-3">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Total Transactions
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{isLoading ? (
								<Skeleton className="h-8 w-20" />
							) : (
								totalTransactions
							)}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Income</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-green-600 dark:text-green-400">
							{isLoading || isLoadingUser ? (
								<Skeleton className="h-8 w-28" />
							) : (
								<NumberFlow
									value={totalIncome}
									format={{
										style: "currency",
										currency: userCurrency,
									}}
								/>
							)}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Expenses</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-red-600 dark:text-red-400">
							{isLoading || isLoadingUser ? (
								<Skeleton className="h-8 w-28" />
							) : (
								<NumberFlow
									value={totalExpenses}
									format={{
										style: "currency",
										currency: userCurrency,
									}}
								/>
							)}
						</div>
					</CardContent>
				</Card>
			</div>

			<TransactionsSankey
				transactions={transactions}
				isLoading={isLoading || isLoadingUser}
				userCurrency={userCurrency}
			/>

			<TransactionsCard menuComponent={menuComponent}>
				<div className="space-y-2">
					{isLoading ? (
						<div className="space-y-2">
							{[...Array(4)].map((_, index) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
								<Skeleton key={index} className="h-16 w-full" />
							))}
						</div>
					) : !filteredTransactions || filteredTransactions.length === 0 ? (
						searchQuery ? (
							<div className="text-center py-8 text-muted-foreground">
								No transactions found matching "{searchQuery}"
							</div>
						) : (
							<TransactionsEmptyPlaceholder />
						)
					) : (
						filteredTransactions
							.sort((a, b) => b.date.localeCompare(a.date))
							.map((transaction) => (
								<TransactionItem
									key={transaction.id}
									transaction={transaction}
								/>
							))
					)}
				</div>
			</TransactionsCard>
		</div>
	);
}
