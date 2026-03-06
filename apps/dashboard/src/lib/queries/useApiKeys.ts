import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

export type ApiKeyRecord = {
  id: string;
  name: string | null;
  start: string | null;
  prefix: string | null;
};

export const apiKeysQueryKey = ["api-keys"] as const;

function parseListResponse(data: unknown): ApiKeyRecord[] {
  const items = (data as { apiKeys?: unknown[] })?.apiKeys ?? [];
  return items
    .map(
      (item) =>
        ({
          id: String((item as { id?: unknown }).id ?? ""),
          name: (item as { name?: string | null }).name ?? null,
          start: (item as { start?: string | null }).start ?? null,
          prefix: (item as { prefix?: string | null }).prefix ?? null,
        }) satisfies ApiKeyRecord,
    )
    .filter((item) => item.id.length > 0);
}

export function useApiKeys() {
  return useQuery<ApiKeyRecord[], Error>({
    queryKey: apiKeysQueryKey,
    queryFn: async () => {
      const { data, error } = await authClient.apiKey.list({});
      if (error) throw new Error(error.message);
      return parseListResponse(data);
    },
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();
  return useMutation<{ key: string }, Error, { name?: string; prefix?: string }>({
    mutationFn: async (payload) => {
      const { data, error } = await authClient.apiKey.create({
        name: payload.name ?? "Dashboard API Key",
        prefix: payload.prefix ?? "gld",
      });
      if (error) throw new Error(error.message);
      const key = (data as { key?: string } | null)?.key ?? null;
      if (!key) throw new Error("No key returned");
      return { key };
    },
    onError: (error) => {
      toast.error("Failed to generate API key", { description: error.message });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: apiKeysQueryKey });
    },
  });
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (keyId) => {
      const { error } = await authClient.apiKey.delete({ keyId });
      if (error) throw new Error(error.message);
    },
    onError: (error) => {
      toast.error("Failed to revoke API key", { description: error.message });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: apiKeysQueryKey });
    },
  });
}
