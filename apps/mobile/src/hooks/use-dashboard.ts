import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

export type Asset = {
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
  asset_id: number;
  amount: string;
  currency: string;
  date: string;
  description: string;
  category: string;
};

type AssetsResponse = {
  totalValue: string;
  assets: Asset[];
  assetsByType: Record<string, Asset[]>;
};

export function useAssets() {
  const [data, setData] = useState<AssetsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<AssetsResponse>('/api/asset');
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useTransactions() {
  const [data, setData] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<Transaction[]>('/api/transaction');
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
