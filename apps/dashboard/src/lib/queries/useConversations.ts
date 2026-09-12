import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UIMessage } from "ai";

import { api, rpcJson } from "../api";

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
    queryFn: async () => rpcJson<ConversationListItem[]>(await api.conversation.$get()),
    enabled,
  });
}

export function useLastConversation() {
  return useQuery<ConversationFull | null, Error>({
    queryKey: lastConversationKey,
    queryFn: async () => {
      const res = await api.conversation.last.$get();
      if (!res.ok) return null;
      return (await res.json()) as unknown as ConversationFull;
    },
  });
}

export function useConversation(id: string | null) {
  return useQuery<ConversationFull | null, Error>({
    queryKey: [...conversationsKey, id],
    queryFn: async () => {
      const res = await api.conversation[":id"].$get({ param: { id: id! } });
      if (!res.ok) return null;
      return (await res.json()) as unknown as ConversationFull;
    },
    enabled: !!id,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation<ConversationFull, Error>({
    mutationFn: async () => rpcJson<ConversationFull>(await api.conversation.$post()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationsKey });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await rpcJson(await api.conversation[":id"].$delete({ param: { id } }));
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
      await rpcJson(await api.conversation[":id"].$patch({ param: { id }, json: { title } }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationsKey });
    },
  });
}
