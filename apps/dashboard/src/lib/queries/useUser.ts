"use client";

import type { UpdateUser } from "@guilders/api/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../auth-client";

const queryKey = ["user-settings"] as const;
const DEFAULT_CURRENCY = "EUR";

export function useUser() {
  return useQuery({
    queryKey,
    queryFn: async () => {
      const { data: payload } = await authApi.getSession();

      return {
        email: payload?.user?.email ?? "",
        settings: {
          // TODO: Replace default currency with persisted user_settings currency once backend migration is done.
          currency: DEFAULT_CURRENCY,
          api_key: null,
          profile_url: null,
        },
        subscription: {
          status: null,
          current_period_end: null,
          trial_end: null,
        },
      };
    },
  });
}

export function useUserToken() {
  return useQuery({
    queryKey: ["user-token"],
    queryFn: async () => {
      const { data: payload } = await authApi.getSession();
      return payload?.session?.token || null;
    },
  });
}

export function useUpdateUserSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateUser) => {
      const currency = input.settings?.currency;
      const current = queryClient.getQueryData<{
        email: string;
        settings: { currency: string; api_key: string | null; profile_url: string | null };
        subscription: {
          status: string | null;
          current_period_end: string | null;
          trial_end: string | null;
        };
      }>(queryKey);

      if (!current) return null;
      return {
        ...current,
        settings: {
          ...current.settings,
          ...(currency ? { currency } : {}),
          ...input.settings,
        },
      };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
    },
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await authApi.signOut();
      if (error) throw new Error(error.message || "Failed to delete account");
      return true;
    },
  });
}
