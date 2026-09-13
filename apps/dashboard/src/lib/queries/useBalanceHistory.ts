import type { BalanceSnapshot, NetWorthSnapshot } from "@guilders/api/types";
import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query";

import { api, rpcJson } from "../api";

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

async function fetchAccountBalanceHistory(
  accountId: number,
  period: Period,
): Promise<BalanceSnapshot[]> {
  const range = periodToDateRange(period);
  const data = await rpcJson<{ snapshots?: BalanceSnapshot[] }>(
    await api.account[":id"]["balance-history"].$get({
      param: { id: String(accountId) },
      query: range,
    }),
  );
  return Array.isArray(data.snapshots) ? data.snapshots : [];
}

export function useBalanceHistory(accountId: number | undefined, period: Period = "1M") {
  return useQuery<BalanceSnapshot[], Error>({
    queryKey: balanceHistoryKey(accountId ?? 0, period),
    queryFn: () => fetchAccountBalanceHistory(accountId!, period),
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useBalanceHistories(
  accounts: { id: number; currency: string }[],
  period: Period = "1M",
) {
  return useQueries({
    queries: accounts.map((account) => ({
      queryKey: balanceHistoryKey(account.id, period),
      queryFn: () => fetchAccountBalanceHistory(account.id, period),
      staleTime: 5 * 60 * 1000,
      placeholderData: keepPreviousData,
    })),
  });
}

export function useNetWorthHistory(period: Period | undefined) {
  const range = periodToDateRange(period ?? "1M");
  return useQuery<NetWorthSnapshot[], Error>({
    queryKey: netWorthHistoryKey(period ?? "1M"),
    queryFn: async () => {
      const data = await rpcJson<{ snapshots?: NetWorthSnapshot[] }>(
        await api["balance-history"].$get({ query: range }),
      );
      return Array.isArray(data.snapshots) ? data.snapshots : [];
    },
    enabled: !!period,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
