import type { Rule, RuleInsert } from "@guilders/api/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api, rpcJson, toastApiError } from "../api";
import { queryKey as transactionQueryKey } from "./useTransactions";

export const queryKey = ["rules"] as const;

export type RulePreviewResponse = {
  count: number;
  samples: {
    id: number;
    description: string;
    amount: string | number;
    merchant_name: string | null;
    category_id: number | null;
  }[];
};

export function useRules() {
  return useQuery({
    queryKey,
    queryFn: async (): Promise<Rule[]> => rpcJson<Rule[]>(await api.rule.$get()),
  });
}

export function useAddRule() {
  const queryClient = useQueryClient();
  return useMutation<Rule, Error, RuleInsert>({
    mutationFn: async (payload) => rpcJson<Rule>(await api.rule.$post({ json: payload })),
    onError: (error) => {
      console.error("Failed to add rule:", error);
      toastApiError("Failed to add rule", error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Rule created");
    },
  });
}

export function useUpdateRule() {
  const queryClient = useQueryClient();
  return useMutation<Rule, Error, { id: number; rule: Partial<RuleInsert> }>({
    mutationFn: async ({ id, rule }) =>
      rpcJson<Rule>(
        await api.rule[":id"].$put({
          param: { id: String(id) },
          json: rule,
        }),
      ),
    onError: (error) => {
      console.error("Failed to update rule:", error);
      toastApiError("Failed to update rule", error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Rule updated");
    },
  });
}

export function useRemoveRule() {
  const queryClient = useQueryClient();
  return useMutation<number, Error, number>({
    mutationFn: async (ruleId) => {
      await rpcJson(await api.rule[":id"].$delete({ param: { id: String(ruleId) } }));
      return ruleId;
    },
    onError: (error) => {
      console.error("Failed to delete rule:", error);
      toastApiError("Failed to delete rule", error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Rule deleted");
    },
  });
}

export function usePreviewRule() {
  return useMutation<RulePreviewResponse, Error, RuleInsert>({
    mutationFn: async (payload) =>
      rpcJson<RulePreviewResponse>(await api.rule.preview.$post({ json: payload })),
    onError: (error) => {
      console.error("Failed to preview rule:", error);
      toastApiError("Failed to preview matches", error);
    },
  });
}

export function useApplyRule() {
  const queryClient = useQueryClient();
  return useMutation<{ updated: number }, Error, number>({
    mutationFn: async (ruleId) =>
      rpcJson<{ updated: number }>(
        await api.rule[":id"].apply.$post({ param: { id: String(ruleId) } }),
      ),
    onError: (error) => {
      console.error("Failed to apply rule:", error);
      toastApiError("Failed to apply rule", error);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: transactionQueryKey });
      toast.success(
        result.updated === 1
          ? "Applied to 1 transaction"
          : `Applied to ${result.updated} transactions`,
      );
    },
  });
}
