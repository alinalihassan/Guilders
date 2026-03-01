import type { BalanceSnapshot, NetWorthSnapshot } from "@guilders/api/types";
import { useQuery } from "@tanstack/react-query";

import { api, edenError } from "../api";

export type { BalanceSnapshot, NetWorthSnapshot };

export type Period = "1W" | "1M" | "3M" | "6M" | "1Y" | "ALL";

export function periodToDateRange(period: Period): { from?: string; to?: string } {
  if (period === "ALL") return {};
  const now = new Date();
  const to = now.toISOString().split("T")[0]!;
  const start = new Date(now);
  switch (period) {
    case "1W":
      start.setDate(start.getDate() - 7);
      break;
    case "1M":
      start.setMonth(start.getMonth() - 1);
      break;
    case "3M":
      start.setMonth(start.getMonth() - 3);
      break;
    case "6M":
      start.setMonth(start.getMonth() - 6);
      break;
    case "1Y":
      start.setFullYear(start.getFullYear() - 1);
      break;
  }
  return { from: start.toISOString().split("T")[0]!, to };
}

export const balanceHistoryKey = (accountId: number, period: Period) =>
  ["balance-history", accountId, period] as const;

export const netWorthHistoryKey = (period: Period) => ["net-worth-history", period] as const;

export function useBalanceHistory(accountId: number | undefined, period: Period = "1M") {
  const range = periodToDateRange(period);
  return useQuery<BalanceSnapshot[], Error>({
    queryKey: balanceHistoryKey(accountId ?? 0, period),
    queryFn: async () => {
      const { data, error } = await api.account({ id: accountId! })["balance-history"].get({
        query: range,
      });
      if (error) throw new Error(edenError(error));
      return (data as { snapshots: BalanceSnapshot[] }).snapshots;
    },
    enabled: !!accountId,
  });
}

export function useNetWorthHistory(period: Period | undefined) {
  const range = periodToDateRange(period ?? "1M");
  return useQuery<NetWorthSnapshot[], Error>({
    queryKey: netWorthHistoryKey(period ?? "1M"),
    queryFn: async () => {
      const { data, error } = await api["balance-history"].get({ query: range });
      if (error) throw new Error(edenError(error));
      return (data as { snapshots: NetWorthSnapshot[] }).snapshots;
    },
    enabled: !!period,
  });
}
