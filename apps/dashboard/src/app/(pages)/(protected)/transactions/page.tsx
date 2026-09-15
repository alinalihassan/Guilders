import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { useRef, useState } from "react";

import { PeriodSelector } from "@/components/dashboard/period-selector";
import {
  KindSelector,
  type TransactionKindFilter,
} from "@/components/dashboard/transactions/kind-selector";
import { TransactionStats } from "@/components/dashboard/transactions/transaction-stats";
import { TransactionsEmptyPlaceholder } from "@/components/dashboard/transactions/transactions-placeholder";
import { TransactionsVirtualList } from "@/components/dashboard/transactions/transactions-virtual-list";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDialog } from "@/hooks/useDialog";
import { isDateOnlyTimestamp } from "@/lib/format-time";
import { useAccounts } from "@/lib/queries/useAccounts";
import { type Period, periodToDateRange } from "@/lib/queries/useBalanceHistory";
import { useCategories } from "@/lib/queries/useCategories";
import { useMerchants } from "@/lib/queries/useMerchants";
import { useRates } from "@/lib/queries/useRates";
import { useTransactions } from "@/lib/queries/useTransactions";
import { useUser } from "@/lib/queries/useUser";
import { buildCategoryLookup } from "@/lib/utils/category-tree";
import { convertToUserCurrency } from "@/lib/utils/financial";

function toFiniteNumber(value: unknown): number {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function transactionDateKey(timestamp: string | Date): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  if (isDateOnlyTimestamp(date)) return date.toISOString().split("T")[0] ?? "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isInPeriod(timestamp: string | Date, period: Period): boolean {
  const range = periodToDateRange(period);
  if (!range.from) return true;
  const key = transactionDateKey(timestamp);
  if (!key) return false;
  if (key < range.from) return false;
  if (range.to && key > range.to) return false;
  return true;
}

function matchesKind(amount: number, kind: TransactionKindFilter): boolean {
  if (kind === "income") return amount > 0;
  if (kind === "expense") return amount < 0;
  return true;
}

export const Route = createFileRoute("/(pages)/(protected)/transactions/")({
  component: TransactionsPage,
});

function TransactionsPage() {
  const { data: transactions, isLoading } = useTransactions();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const { data: merchants } = useMerchants();
  const { data: rates } = useRates();
  const { data: user, isLoading: isLoadingUser } = useUser();
  const { open: openAddTransaction } = useDialog("addTransaction");
  const [searchQuery, setSearchQuery] = useState("");
  const [period, setPeriod] = useState<Period>("1M");
  const [kind, setKind] = useState<TransactionKindFilter>("all");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const userCurrency = user?.currency ?? "EUR";

  const categoryLookup = buildCategoryLookup(categories ?? []);
  const merchantsById = new Map(merchants?.map((merchant) => [merchant.id, merchant]) ?? []);
  const merchantLookup = new Map(
    merchants?.map((merchant) => [merchant.id, merchant.name ?? ""] as const) ?? [],
  );
  const accountsById = new Map(accounts?.map((account) => [account.id, account.name]) ?? []);

  const periodTransactions = (transactions ?? []).filter((transaction) =>
    isInPeriod(transaction.timestamp, period),
  );
  const scopedTransactions = periodTransactions.filter((transaction) =>
    matchesKind(toFiniteNumber(transaction.amount), kind),
  );

  const totalIncome = periodTransactions.reduce((sum, transaction) => {
    const amount = toFiniteNumber(transaction.amount);
    if (amount <= 0) return sum;
    const converted = convertToUserCurrency(amount, transaction.currency, rates, userCurrency);
    return sum + (Number.isFinite(converted) ? converted : 0);
  }, 0);

  const totalExpenses = periodTransactions.reduce((sum, transaction) => {
    const amount = toFiniteNumber(transaction.amount);
    if (amount >= 0) return sum;
    const converted = convertToUserCurrency(amount, transaction.currency, rates, userCurrency);
    return sum + Math.abs(Number.isFinite(converted) ? converted : 0);
  }, 0);

  const searchLower = searchQuery.toLowerCase();
  const visibleTransactions = scopedTransactions.filter((transaction) => {
    if (!searchLower) return true;
    const categoryName =
      (transaction.category_id != null
        ? categoryLookup.get(transaction.category_id)?.name
        : undefined) ?? "";
    const merchantLabel =
      (transaction.merchant_id != null ? merchantLookup.get(transaction.merchant_id) : undefined) ??
      "";
    const accountName =
      transaction.account_id != null ? (accountsById.get(transaction.account_id) ?? "") : "";
    return (
      transaction.description?.toLowerCase().includes(searchLower) ||
      categoryName.toLowerCase().includes(searchLower) ||
      merchantLabel.toLowerCase().includes(searchLower) ||
      accountName.toLowerCase().includes(searchLower) ||
      toFiniteNumber(transaction.amount).toString().includes(searchLower) ||
      transaction.currency.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium tracking-tight">Transactions</h1>
        <Button onClick={() => openAddTransaction({})} size="sm">
          <Plus className="h-4 w-4" />
          Add Transaction
        </Button>
      </div>

      <TransactionStats
        count={periodTransactions.length}
        income={totalIncome}
        expenses={totalExpenses}
        currency={userCurrency}
        isLoading={isLoading || isLoadingUser}
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div
          className="bg-muted/70 flex w-full items-center rounded-full px-3 py-1.5 md:max-w-xs"
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
        <div className="flex flex-wrap items-center gap-2">
          <KindSelector value={kind} onChange={setKind} />
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[...Array(6)].map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : visibleTransactions.length === 0 ? (
        searchQuery || kind !== "all" ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            No transactions match these filters
          </p>
        ) : (
          <TransactionsEmptyPlaceholder />
        )
      ) : (
        <TransactionsVirtualList
          scroll="page"
          variant="ledger"
          transactions={visibleTransactions.toSorted(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
          )}
          merchantsById={merchantsById}
          accountsById={accountsById}
        />
      )}
    </div>
  );
}
