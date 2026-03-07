"use client";

import type { ChatLimits } from "@guilders/api/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { api, edenError } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

export const chatLimitsKey = ["chat", "limits"] as const;

export function getChatLimitsQueryKey(viewerId: string) {
  return [...chatLimitsKey, viewerId] as const;
}

function useViewerId() {
  return useQuery({
    queryKey: ["viewer-id"],
    queryFn: async (): Promise<string | null> => {
      const { data } = await authClient.getSession();
      const id = (data?.user as { id?: string } | undefined)?.id;
      return id ?? null;
    },
  });
}

export function useChatLimits() {
  const { data: viewerId } = useViewerId();
  const queryKey = viewerId ? getChatLimitsQueryKey(viewerId) : [...chatLimitsKey, null];

  return useQuery({
    queryKey,
    queryFn: async (): Promise<ChatLimits> => {
      const { data, error } = await api.chat.limits.get();
      if (error) throw new Error(edenError(error));
      return data;
    },
    enabled: !!viewerId,
  });
}

export function useInvalidateChatLimits() {
  const queryClient = useQueryClient();
  const { data: viewerId } = useViewerId();

  return () =>
    queryClient.invalidateQueries({
      queryKey: viewerId ? getChatLimitsQueryKey(viewerId) : chatLimitsKey,
    });
}
