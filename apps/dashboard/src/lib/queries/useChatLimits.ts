"use client";

import type { ChatLimits } from "@guilders/api/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { api, edenError } from "@/lib/api";

export const chatLimitsKey = ["chat", "limits"] as const;

export function useChatLimits() {
  return useQuery({
    queryKey: chatLimitsKey,
    queryFn: async (): Promise<ChatLimits> => {
      const { data, error } = await api.chat.limits.get();
      if (error) throw new Error(edenError(error));
      return data as ChatLimits;
    },
  });
}

export function useInvalidateChatLimits() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: chatLimitsKey });
}
