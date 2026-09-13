import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { TransactionsCard } from "@/components/dashboard/transactions/transactions-card";
import { TransactionsEmptyPlaceholder } from "@/components/dashboard/transactions/transactions-placeholder";
import { TransactionsSankey } from "@/components/dashboard/transactions/transactions-sankey";
import { TransactionsVirtualList } from "@/components/dashboard/transactions/transactions-virtual-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import NumberFlow from "@/components/ui/number-flow";
import { Skeleton } from "@/components/ui/skeleton";
import { useDialog } from "@/hooks/useDialog";
import { useCategories } from "@/lib/queries/useCategories";
import { useMerchants } from "@/lib/queries/useMerchants";
import { useTransactions } from "@/lib/queries/useTransactions";
import { useUser } from "@/lib/queries/useUser";
import { cn } from "@/lib/utils";
import { buildCategoryLookup } from "@/lib/utils/category-tree";
import { convertToUserCurrency } from "@/lib/utils/financial";

function toFiniteNumber(value: unknown): number {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function convertAmountSafely(amount: unknown, fromCurrency: string, userCurrency: string): number {
  const normalizedAmount = toFiniteNumber(amount);
  const convertedAmount = convertToUserCurrency(normalizedAmount, fromCurrency, [], userCurrency);
  return Number.isFinite(convertedAmount) ? convertedAmount : 0;
}

export const Route = createFileRoute("/(pages)/(protected)/transactions/")({
  component: TransactionsPage,
});

function TransactionsPage() {
  const { data: transactions, isLoading } = useTransactions();
  const { data: categories } = useCategories();
  const { data: merchants } = useMerchants();
  const categoryLookup = buildCategoryLookup(categories ?? []);
  const merchantsById = useMemo(() => new Map(merchants?.map((m) => [m.id, m]) ?? []), [merchants]);
  const merchantLookup = useMemo(() => {
    const map = new Map<number, string>();
    for (const m of merchants ?? []) {
      map.set(m.id, m.name ?? "");
    }
    return map;
  }, [merchants]);
  const { data: user, isLoading: isLoadingUser } = useUser();
  const { open: openAddTransaction } = useDialog("addTransaction");
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const userCurrency = user?.currency ?? "EUR";

  const totalIncome =
    transactions?.reduce((sum, t) => {
      const amount = toFiniteNumber(t.amount);
      if (amount <= 0) return sum;
      return sum + convertAmountSafely(amount, t.currency, userCurrency);
    }, 0) ?? 0;

  const totalExpenses =
    transactions?.reduce((sum, t) => {
      const amount = toFiniteNumber(t.amount);
      if (amount >= 0) return sum;
      return sum + Math.abs(convertAmountSafely(amount, t.currency, userCurrency));
    }, 0) ?? 0;

  const totalTransactions = transactions?.length ?? 0;

  const filteredTransactions = transactions?.filter((transaction) => {
    const searchLower = searchQuery.toLowerCase();
    const categoryName =
      (transaction.category_id != null
        ? categoryLookup.get(transaction.category_id)?.name
        : undefined) ?? "";
    const merchantLabel =
      (transaction.merchant_id != null ? merchantLookup.get(transaction.merchant_id) : undefined) ??
      "";
    return (
      transaction.description?.toLowerCase().includes(searchLower) ||
      categoryName.toLowerCase().includes(searchLower) ||
      merchantLabel.toLowerCase().includes(searchLower) ||
      toFiniteNumber(transaction.amount).toString().includes(searchLower) ||
      transaction.currency.toLowerCase().includes(searchLower)
    );
  });

  const menuComponent = (
    <div
      className="bg-muted/70 flex w-full items-center rounded-full px-3 py-1.5 md:w-64"
      onClick={() => searchInputRef.current?.focus()}
    >
      <Search className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
      <input
        ref={searchInputRef}
        type="search"
        placeholder="Search"
        className="placeholder:text-muted-foreground ml-2 w-full bg-transparent text-sm outline-none"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </div>
  );

  return (
    <div className="space-y-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium tracking-tight">Transactions</h1>
        <Button onClick={() => openAddTransaction({})} size="sm">
          <Plus className="h-4 w-4" />
          Add Transaction
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <SummaryStat label="Transactions" value={totalTransactions} isLoading={isLoading} />
        <SummaryStat
          label="Income"
          value={totalIncome}
          currency={userCurrency}
          tone="income"
          isLoading={isLoading || isLoadingUser}
        />
        <SummaryStat
          label="Expenses"
          value={totalExpenses}
          currency={userCurrency}
          tone="expense"
          isLoading={isLoading || isLoadingUser}
        />
      </div>

      <TransactionsSankey
        transactions={transactions}
        isLoading={isLoading || isLoadingUser}
        userCurrency={userCurrency}
      />

      <TransactionsCard menuComponent={menuComponent}>
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[...Array(4)].map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : !filteredTransactions || filteredTransactions.length === 0 ? (
          searchQuery ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No transactions found matching “{searchQuery}”
            </p>
          ) : (
            <TransactionsEmptyPlaceholder />
          )
        ) : (
          <TransactionsVirtualList
            scroll="page"
            transactions={filteredTransactions.toSorted(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
            )}
            merchantsById={merchantsById}
          />
        )}
      </TransactionsCard>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  currency,
  tone,
  isLoading,
}: {
  label: string;
  value: number;
  currency?: string;
  tone?: "income" | "expense";
  isLoading: boolean;
}) {
  return (
    <Card className="shadow-none">
      <CardContent className="flex flex-col gap-3 p-6">
        <p className="text-muted-foreground text-[11px] font-medium tracking-[0.16em] uppercase">
          {label}
        </p>
        {isLoading ? (
          <Skeleton className="h-8 w-28" />
        ) : currency ? (
          <NumberFlow
            value={value}
            format={{ style: "currency", currency }}
            className={cn(
              "font-mono text-2xl tracking-tight tabular-nums",
              tone === "income" && "text-emerald-600 dark:text-emerald-400",
              tone === "expense" && "text-red-600 dark:text-red-400",
            )}
          />
        ) : (
          <p className="font-mono text-2xl tracking-tight tabular-nums">{value.toLocaleString()}</p>
        )}
      </CardContent>
    </Card>
  );
}
