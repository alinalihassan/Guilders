import type { Merchant, MerchantInsert } from "@guilders/api/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api, rpcJson } from "../api";

export const queryKey = ["merchants"] as const;

export function useMerchants() {
  return useQuery({
    queryKey,
    queryFn: async (): Promise<Merchant[]> => rpcJson<Merchant[]>(await api.merchant.$get()),
  });
}

export function useAddMerchant() {
  const queryClient = useQueryClient();
  return useMutation<Merchant, Error, Partial<MerchantInsert>>({
    mutationFn: async (payload) => {
      if (!payload.name) {
        throw new Error("Merchant name is required for add");
      }

      const body = {
        ...payload,
        name: payload.name,
        logo_url: payload.logo_url ?? undefined,
        website_url: payload.website_url ?? undefined,
      };
      return rpcJson<Merchant>(await api.merchant.$post({ json: body }));
    },
    onError: (error) => {
      console.error("Failed to add merchant:", error);
      toast.error("Failed to add merchant", {
        description: "Please try again later",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Merchant added");
    },
  });
}

export function useUpdateMerchant() {
  const queryClient = useQueryClient();
  return useMutation<Merchant, Error, { id: number; merchant: Partial<MerchantInsert> }>({
    mutationFn: async ({ id, merchant }) => {
      if (!merchant.name) {
        throw new Error("Merchant name is required for update");
      }

      const body = {
        ...merchant,
        name: merchant.name,
        logo_url: merchant.logo_url ?? undefined,
        website_url: merchant.website_url ?? undefined,
      };
      return rpcJson<Merchant>(
        await api.merchant[":id"].$put({
          param: { id: String(id) },
          json: body,
        }),
      );
    },
    onError: (error) => {
      console.error("Failed to update merchant:", error);
      toast.error("Failed to update merchant", {
        description: "Please try again later",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Merchant updated");
    },
  });
}

export function useRemoveMerchant() {
  const queryClient = useQueryClient();
  return useMutation<number, Error, number>({
    mutationFn: async (merchantId) => {
      await rpcJson(await api.merchant[":id"].$delete({ param: { id: String(merchantId) } }));
      return merchantId;
    },
    onError: (error) => {
      console.error("Failed to delete merchant:", error);
      toast.error("Failed to delete merchant", {
        description: "Please try again later",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Merchant deleted");
    },
  });
}
