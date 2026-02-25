import { useCallback, useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";

export type Account = {
  id: number;
  name: string;
  type: string;
  subtype: string;
  value: string;
  currency: string;
  institution_connection_id: number | null;
  image: string | null;
};

export type Transaction = {
  id: number;
  account_id: number;
  amount: string;
  currency: string;
  date: string;
  description: string;
  category_id: number;
};

export function useAccounts() {
  const [data, setData] = useState<Account[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<Account[]>("/api/account");
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const totalValue = useMemo(() => {
    if (!data) return 0;
    return data.reduce((sum, a) => {
      const v = parseFloat(a.value);
      return sum + (a.type === "liability" ? -v : v);
    }, 0);
  }, [data]);

  return { data, totalValue, loading, error, refetch: fetch };
}

export function useTransactions() {
  const [data, setData] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<Transaction[]>("/api/transaction");
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
