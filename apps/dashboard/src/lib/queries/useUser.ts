"use client";

import type { UpdateUser, User } from "@guilders/api/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { authClient } from "../auth-client";

const queryKey = ["user"] as const;

// @ts-ignore TODO: Better Auth 1.5.0 issue, subscription type not inferred from stripeClient plugin
const subscriptionClient = authClient.subscription as {
  list: () => Promise<{
    data: Array<{
      status: string;
      periodEnd?: string | Date | null;
      trialEnd?: string | Date | null;
    }> | null;
  }>;
};

async function fetchSubscription(): Promise<User["subscription"]> {
  try {
    const { data: subscriptions } = await subscriptionClient.list();
    const active = subscriptions?.find(
      (sub) => sub.status === "active" || sub.status === "trialing",
    );
    if (!active) return { status: null, current_period_end: null, trial_end: null };
    return {
      status: active.status,
      current_period_end: active.periodEnd ? new Date(active.periodEnd).toISOString() : null,
      trial_end: active.trialEnd ? new Date(active.trialEnd).toISOString() : null,
    };
  } catch (error) {
    console.error("[useUser] Failed to fetch subscription", error);
    return { status: null, current_period_end: null, trial_end: null };
  }
}

function mapRawToUser(
  user: Record<string, unknown> | undefined,
  subscription: User["subscription"],
): User {
  return {
    email: (user?.email as string) ?? "",
    currency: (user?.currency as string) ?? "EUR",
    subscription,
  } as User;
}

export function useUser() {
  return useQuery<User, Error>({
    queryKey,
    queryFn: async () => {
      const [{ data: payload }, subscription] = await Promise.all([
        authClient.getSession(),
        fetchSubscription(),
      ]);
      const user = payload?.user as Record<string, unknown> | undefined;
      return mapRawToUser(user, subscription);
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

      const [{ data: payload }, subscription] = await Promise.all([
        authClient.getSession(),
        fetchSubscription(),
      ]);
      const user = payload?.user as Record<string, unknown> | undefined;
      return mapRawToUser(user, subscription);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
    },
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: async () => {
      // TODO: Implement this
    },
  });
}
