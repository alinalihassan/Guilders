"use client";

import { useAccounts } from "@/lib/queries/useAccounts";
import { useRates } from "@/lib/queries/useRates";
import { useUser } from "@/lib/queries/useUser";
import {
  calculateCategories,
  calculateCategorySums,
} from "@/lib/utils/financial";
import {
  getCategoryColor,
  getCategoryDisplayName,
} from "@/lib/account-types";
import { Skeleton } from "@/components/ui/skeleton";
import { WalletCards } from "lucide-react";
import { useMemo } from "react";

export function NetWorthCategories() {
  const { data: accounts, isLoading, isError, error } = useAccounts();
  const { data: rates } = useRates();
  const { data: user } = useUser();

  const leafAccounts = useMemo(() => {
    if (!accounts) return accounts;

    const parentIds = new Set(
      accounts
        .filter((account) => (account as { parent?: number | null }).parent != null)
        .map((account) => (account as { parent?: number | null }).parent as number),
    );

    return accounts.filter((account) => !parentIds.has(account.id));
  }, [accounts]);

  const categories = useMemo(() => {
    return calculateCategories(
      leafAccounts,
      rates,
      user?.settings.currency ?? "EUR",
    );
  }, [leafAccounts, rates, user?.settings.currency]);

  const { positiveSum, negativeSum } = useMemo(() => {
    return calculateCategorySums(categories);
  }, [categories]);

  return (
    <>
      {isError && (
        <div className="text-red-500">
          Error loading accounts: {error.message}
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows are static placeholders
            <div key={index} className="flex items-center">
              <Skeleton className="w-3 h-3 rounded-full mr-2" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-8 ml-auto" />
            </div>
          ))}
        </div>
      )}

      {!isLoading &&
        !isError &&
        (categories.positive.length === 0 &&
        categories.negative.length === 0 ? (
          <div className="flex shrink-0 items-center justify-center rounded-md py-8">
            <div className="mx-auto flex flex-col items-center justify-center text-center">
              <WalletCards className="h-10 w-10 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">
                No categories to show
              </h3>
              <p className="mb-4 mt-2 text-sm text-muted-foreground">
                Add some accounts to see your net worth breakdown.
              </p>
            </div>
          </div>
        ) : (
          <>
            {categories.positive.length > 0 && (
              <>
                <h3 className="text-md font-medium mb-2 text-foreground/80">
                  Assets
                </h3>
                <div className="flex mb-2">
                  {categories.positive.map((category, index) => {
                    const percentage = (
                      (category.value / positiveSum) *
                      100
                    ).toFixed(0);
                    return (
                      <div
                        key={category.name}
                        className={`h-4
                            ${index > 0 ? "ml-0.5" : ""}
                            ${index < categories.positive.length - 1 ? "mr-0.5" : ""}
                            ${index === 0 ? "rounded-l-sm" : ""}
                            ${index === categories.positive.length - 1 ? "rounded-r-sm" : ""}
                          `}
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: getCategoryColor(category.name),
                        }}
                      />
                    );
                  })}
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {categories.positive.map((category) => {
                    const percentage = (
                      (category.value / positiveSum) *
                      100
                    ).toFixed(0);
                    return (
                      <div key={category.name} className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{
                            backgroundColor: getCategoryColor(category.name),
                          }}
                        />
                        <span className="text-sm font-light">
                          {getCategoryDisplayName(category.name)}
                        </span>
                        <span className="text-foreground/60 font-light text-sm ml-auto">
                          {percentage}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {categories.negative.length > 0 && (
              <>
                <h3 className="text-md font-medium mb-2 text-foreground/80">
                  Liabilities
                </h3>
                <div className="flex mb-2">
                  {categories.negative.map((category, index) => {
                    const percentage = (
                      (Math.abs(category.value) / negativeSum) *
                      100
                    ).toFixed(0);
                    return (
                      <div
                        key={category.name}
                        className={`h-4
                            ${index > 0 ? "ml-0.5" : ""}
                            ${index < categories.negative.length - 1 ? "mr-0.5" : ""}
                            ${index === 0 ? "rounded-l-sm" : ""}
                            ${index === categories.negative.length - 1 ? "rounded-r-sm" : ""}
                          `}
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: getCategoryColor(category.name),
                          opacity: 0.7,
                        }}
                      />
                    );
                  })}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {categories.negative.map((category) => {
                    const percentage = (
                      (Math.abs(category.value) / negativeSum) *
                      100
                    ).toFixed(0);
                    return (
                      <div key={category.name} className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{
                            backgroundColor: getCategoryColor(category.name),
                          }}
                        />
                        <span className="text-sm font-light">
                          {getCategoryDisplayName(category.name)}
                        </span>
                        <span className="text-foreground/60 font-light text-sm ml-auto">
                          {percentage}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        ))}
    </>
  );
}
