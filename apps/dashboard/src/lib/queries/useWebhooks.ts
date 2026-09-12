import type { Webhook, WebhookCreateResponse } from "@guilders/api/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api, rpcJson } from "@/lib/api";

export type { Webhook, WebhookCreateResponse };

export const webhooksQueryKey = ["webhooks"] as const;

export function useWebhooks() {
  return useQuery<Webhook[], Error>({
    queryKey: webhooksQueryKey,
    queryFn: async () => rpcJson<Webhook[]>(await api.webhook.$get()),
  });
}

export function useCreateWebhook() {
  const queryClient = useQueryClient();
  return useMutation<WebhookCreateResponse, Error, { url: string }>({
    mutationFn: async ({ url }) =>
      rpcJson<WebhookCreateResponse>(await api.webhook.$post({ json: { url } })),
    onError: (error) => {
      toast.error("Failed to create webhook endpoint", { description: error.message });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: webhooksQueryKey });
    },
  });
}

export function useUpdateWebhook() {
  const queryClient = useQueryClient();
  return useMutation<Webhook, Error, { id: string; enabled?: boolean; url?: string }>({
    mutationFn: async ({ id, ...body }) =>
      rpcJson<Webhook>(await api.webhook[":id"].$patch({ param: { id }, json: body })),
    onError: (error) => {
      toast.error("Failed to update webhook", { description: error.message });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: webhooksQueryKey });
    },
  });
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await rpcJson(await api.webhook[":id"].$delete({ param: { id } }));
    },
    onError: (error) => {
      toast.error("Failed to delete webhook endpoint", { description: error.message });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: webhooksQueryKey });
    },
  });
}
