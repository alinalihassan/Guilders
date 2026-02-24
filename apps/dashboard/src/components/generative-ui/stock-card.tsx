"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

import { AccountFallbackIcon } from "@/components/dashboard/accounts/account-fallback-icon";
import { cn } from "@/lib/utils";

export type StockCardProps = {
  accountId: number;
  subtype?: string | null;
  image?: string | null;
  symbol: string;
  accountName: string;
  currency: string;
  currentValue: string;
  totalChange?: string | null;
};

export function StockCard({
  accountId,
  subtype,
  image,
  symbol,
  accountName,
  currency,
  currentValue,
  totalChange,
}: StockCardProps) {
  const router = useRouter();

  const isNegative = (totalChange ?? "").trim().startsWith("-");

  return (
    <button
      type="button"
      onClick={() => router.push(`/accounts/${accountId}`)}
      className="w-full rounded-2xl border border-border/70 bg-card text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {image ? (
              <Image
                src={image}
                alt={accountName}
                width={36}
                height={36}
                className="rounded-full border bg-background/70 p-1"
              />
            ) : (
              <div className="rounded-full border bg-background/70 p-2 text-muted-foreground">
                <AccountFallbackIcon subtype={subtype} size={20} />
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{accountName}</p>
              <h3 className="text-lg font-semibold leading-tight">{symbol}</h3>
            </div>
          </div>
          <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
            {currency}
          </span>
        </div>

        <div className="rounded-xl bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">Current value</p>
          <p className="mt-1 text-2xl font-semibold leading-none">{currentValue}</p>
          {totalChange ? (
            <p
              className={cn(
                "mt-2 inline-flex rounded-full px-2 py-1 text-xs font-medium",
                isNegative
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
              )}
            >
              {totalChange}
            </p>
          ) : null}
        </div>
      </div>
    </button>
  );
}
