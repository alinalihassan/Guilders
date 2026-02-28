"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { authClient } from "../auth-client";

export const mfaQueryKey = ["mfa-status"] as const;
export const passkeysQueryKey = ["passkeys"] as const;

export function useMFAStatus() {
  return useQuery({
    queryKey: mfaQueryKey,
    queryFn: async () => {
      const { data, error } = await authClient.getSession();
      if (error) throw new Error(error.message);
      return Boolean(
        (data as { user?: { twoFactorEnabled?: boolean } })?.user?.twoFactorEnabled,
      );
    },
    staleTime: 30_000,
  });
}

export function usePasskeys() {
  return useQuery({
    queryKey: passkeysQueryKey,
    queryFn: async () => {
      const { data, error } = await authClient.passkey.listUserPasskeys({});
      if (error) throw new Error(error.message);
      return (
        ((data as Array<{ id: string; name?: string } | null>) ?? []).filter(
          (item): item is { id: string; name?: string } => Boolean(item?.id),
        )
      );
    },
    staleTime: 30_000,
  });
}

export function useAddPasskey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await authClient.passkey.addPasskey({});
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: passkeysQueryKey });
    },
  });
}

export function useRenamePasskey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await authClient.passkey.updatePasskey({ id, name });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: passkeysQueryKey });
    },
  });
}

export function useDeletePasskey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await authClient.passkey.deletePasskey({ id });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: passkeysQueryKey });
    },
  });
}
