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
  value: number;
  cost?: number | null;
  currentValue?: string | null;
  totalChange?: string | null;
};

const parseNumberFromMixed = (value: string | number | null | undefined) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const numeric = Number.parseFloat(
    value.replaceAll(",", "").replace(/[^\d+-.]/g, ""),
  );

  return Number.isFinite(numeric) ? numeric : null;
};

const formatCurrencyValue = (value: number, currency: string) => {
  const numeric = value;

  if (!Number.isFinite(numeric)) {
    return currency;
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(numeric);
  } catch {
    return `${numeric.toFixed(2)} ${currency}`.trim();
  }
};

const formatPercentChange = ({
  value,
  cost,
  currentValue,
  totalChange,
}: {
  value: number;
  cost?: number | null;
  currentValue?: string | null;
  totalChange?: string | null;
}) => {
  if (typeof cost === "number" && Number.isFinite(cost) && cost > 0) {
    const pct = ((value - cost) / cost) * 100;
    const sign = pct < 0 ? "-" : "+";
    const abs = Math.abs(pct);
    return `${sign}${abs.toFixed(2)}%`;
  }

  const currentValueNumber = parseNumberFromMixed(currentValue);
  const totalChangeNumber = parseNumberFromMixed(totalChange);

  if (
    typeof currentValueNumber === "number" &&
    Number.isFinite(currentValueNumber) &&
    currentValueNumber !== 0 &&
    typeof totalChangeNumber === "number" &&
    Number.isFinite(totalChangeNumber)
  ) {
    const pct = (totalChangeNumber / currentValueNumber) * 100;
    const sign = pct < 0 ? "-" : "+";
    const abs = Math.abs(pct);
    return `${sign}${abs.toFixed(2)}%`;
  }

  return null;
};

export function StockCard({
  accountId,
  subtype,
  image,
  symbol,
  accountName,
  currency,
  value,
  cost,
  currentValue,
  totalChange,
}: StockCardProps) {
  const router = useRouter();
  const formattedCurrentValue = formatCurrencyValue(value, currency);
  const formattedPercentChange = formatPercentChange({ value, cost, currentValue, totalChange });
  const isNegative = (formattedPercentChange ?? "").startsWith("-");

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
          <p className="mt-1 text-2xl font-semibold leading-none">{formattedCurrentValue}</p>
          {formattedPercentChange ? (
            <p
              className={cn(
                "mt-2 inline-flex rounded-full px-2 py-1 text-xs font-medium",
                isNegative
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
              )}
            >
              {formattedPercentChange}
            </p>
          ) : null}
        </div>
      </div>
    </button>
  );
}
