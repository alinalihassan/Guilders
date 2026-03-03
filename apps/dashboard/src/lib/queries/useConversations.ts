import type { UIMessage } from "ai";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, edenError } from "../api";

type ConversationListItem = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type ConversationFull = {
  id: string;
  title: string;
  messages: UIMessage[];
};

export const conversationsKey = ["conversations"] as const;
export const lastConversationKey = ["conversations", "last"] as const;

export function useConversations(enabled = true) {
  return useQuery<ConversationListItem[], Error>({
    queryKey: conversationsKey,
    queryFn: async () => {
      const { data, error } = await api.conversation.get();
      if (error) throw new Error(edenError(error));
      return (data ?? []) as ConversationListItem[];
    },
    enabled,
  });
}

export function useLastConversation() {
  return useQuery<ConversationFull | null, Error>({
    queryKey: lastConversationKey,
    queryFn: async () => {
      const { data, error } = await api.conversation.last.get();
      if (error || !data) return null;
      return data as ConversationFull;
    },
  });
}

export function useConversation(id: string | null) {
  return useQuery<ConversationFull | null, Error>({
    queryKey: [...conversationsKey, id],
    queryFn: async () => {
      const { data, error } = await api.conversation({ id: id! }).get();
      if (error || !data) return null;
      return data as ConversationFull;
    },
    enabled: !!id,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation<ConversationFull, Error>({
    mutationFn: async () => {
      const { data, error } = await api.conversation.post();
      if (error) throw new Error(edenError(error));
      return data as ConversationFull;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationsKey });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const { error } = await api.conversation({ id }).delete();
      if (error) throw new Error(edenError(error));
    },
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: [...conversationsKey, id] });
      queryClient.invalidateQueries({ queryKey: conversationsKey });
    },
  });
}

export function useRenameConversation() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { id: string; title: string }>({
    mutationFn: async ({ id, title }) => {
      const { error } = await api.conversation({ id }).patch({ title });
      if (error) throw new Error(edenError(error));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationsKey });
    },
  });
}
