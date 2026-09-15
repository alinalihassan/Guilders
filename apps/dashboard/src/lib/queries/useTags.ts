import type { Tag, TagInsert } from "@guilders/api/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api, rpcJson, toastApiError } from "../api";

export const queryKey = ["tags"] as const;

export function useTags() {
  return useQuery({
    queryKey,
    queryFn: async (): Promise<Tag[]> => rpcJson<Tag[]>(await api.tag.$get()),
  });
}

export function useAddTag() {
  const queryClient = useQueryClient();
  return useMutation<Tag, Error, Partial<TagInsert>>({
    mutationFn: async (payload) => {
      if (!payload.name) {
        throw new Error("Tag name is required for add");
      }

      return rpcJson<Tag>(await api.tag.$post({ json: { name: payload.name } }));
    },
    onError: (error) => {
      console.error("Failed to add tag:", error);
      toastApiError("Failed to add tag", error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useRemoveTag() {
  const queryClient = useQueryClient();
  return useMutation<number, Error, number>({
    mutationFn: async (tagId) => {
      await rpcJson(await api.tag[":id"].$delete({ param: { id: String(tagId) } }));
      return tagId;
    },
    onError: (error) => {
      console.error("Failed to delete tag:", error);
      toastApiError("Failed to delete tag", error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Tag deleted");
    },
  });
}
