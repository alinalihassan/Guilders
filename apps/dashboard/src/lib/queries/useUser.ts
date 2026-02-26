"use client";

import type { UpdateUser, User } from "@guilders/api/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { authClient } from "../auth-client";

const queryKey = ["user"] as const;

export function useUser() {
  return useQuery<User, Error>({
    queryKey,
    queryFn: async () => {
      const { data: payload } = await authClient.getSession();
      const user = payload?.user as Record<string, unknown> | undefined;

      return {
        email: user?.email as string ?? "",
        currency: (user?.currency as string) ?? "EUR",
        subscription: {
          status: null,
          current_period_end: null,
          trial_end: null,
        },
      } as User;
    },
  });
}

export function useUserToken() {
  return useQuery({
    queryKey: ["user-token"],
    queryFn: async () => {
      const { data: payload } = await authClient.getSession();
      return payload?.session?.token || null;
    },
  });
}

export function useUpdateUserSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateUser) => {
      if (input.currency) {
        await authClient.updateUser({ currency: input.currency });
      }

      const { data: payload } = await authClient.getSession();
      const user = payload?.user as Record<string, unknown> | undefined;

      return {
        email: user?.email as string ?? "",
        currency: (user?.currency as string) ?? "EUR",
        subscription: {
          status: null,
          current_period_end: null,
          trial_end: null,
        },
      } as User;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
    },
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await authClient.signOut();
      if (error) throw new Error(error.message || "Failed to delete account");
      return true;
    },
  });
}
