import type { Webhook, WebhookCreateResponse } from "@guilders/api/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api, edenError } from "@/lib/api";

export type { Webhook, WebhookCreateResponse };

export const webhooksQueryKey = ["webhooks"] as const;

export function useWebhooks() {
  return useQuery<Webhook[], Error>({
    queryKey: webhooksQueryKey,
    queryFn: async () => {
      const { data, error } = await api.webhook.get();
      if (error) throw new Error(edenError(error));
      return (data ?? []) as unknown as Webhook[];
    },
  });
}

export function useCreateWebhook() {
  const queryClient = useQueryClient();
  return useMutation<WebhookCreateResponse, Error, { url: string }>({
    mutationFn: async ({ url }) => {
      const { data, error } = await api.webhook.post({ url });
      if (error) throw new Error(edenError(error));
      if (!data || typeof data !== "object" || "error" in data)
        throw new Error("Failed to create webhook");
      return data as unknown as WebhookCreateResponse;
    },
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
    mutationFn: async ({ id, ...body }) => {
      const { data, error } = await api.webhook({ id }).patch(body);
      if (error) throw new Error(edenError(error));
      if (!data || typeof data !== "object" || "error" in data)
        throw new Error("Failed to update webhook");
      return data as unknown as Webhook;
    },
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
      const { error } = await api.webhook({ id }).delete();
      if (error) throw new Error(edenError(error));
    },
    onError: (error) => {
      toast.error("Failed to delete webhook endpoint", { description: error.message });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: webhooksQueryKey });
    },
  });
}
