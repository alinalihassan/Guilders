"use client";

import type { UIMessage } from "ai";
import { Loader2, MoreVertical, Pencil, PlusCircle, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { AdvisorChat } from "@/components/advisor/advisor-chat";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDialog } from "@/hooks/useDialog";
import { api, edenError } from "@/lib/api";
import { useStore } from "@/lib/store";
import { getDefaultSessionTitle } from "@/lib/store/advisorStore";

export function AdvisorSidebar() {
  const sessionTitle = useStore((state) => state.sessionTitle);
  const currentChatId = useStore((state) => state.currentChatId);
  const initialMessages = useStore((state) => state.initialMessages);
  const setCurrentChat = useStore((state) => state.setCurrentChat);
  const clearChat = useStore((state) => state.clearChat);
  const setSessionTitle = useStore((state) => state.setSessionTitle);

  const { open: openConfirmation } = useDialog("confirmation");
  const { open: openInputPrompt } = useDialog("inputPrompt");

  const [chatKey, setChatKey] = useState(0);
  const [loading, setLoading] = useState(true);

  const createNewConversation = useCallback(async () => {
    const { data, error } = await api.conversation.post();
    if (error || !data) {
      clearChat();
      return;
    }
    const conv = data as { id: string; title: string };
    setCurrentChat(conv.id, conv.title, []);
  }, [clearChat, setCurrentChat]);

  const loadLastConversation = useCallback(async () => {
    try {
      const { data, error } = await api.conversation.last.get();
      if (error || !data) {
        await createNewConversation();
        return;
      }
      const conv = data as { id: string; title: string; messages: unknown[] };
      setCurrentChat(conv.id, conv.title, conv.messages as UIMessage[]);
    } catch {
      await createNewConversation();
    } finally {
      setLoading(false);
    }
  }, [createNewConversation, setCurrentChat]);

  useEffect(() => {
    void loadLastConversation();
  }, [loadLastConversation]);

  const handleNewChat = async () => {
    await createNewConversation();
    setChatKey((k) => k + 1);
  };

  const handleChangeName = () => {
    openInputPrompt({
      title: "Rename conversation",
      description: "Give this conversation a name.",
      placeholder: "Conversation name",
      defaultValue: sessionTitle,
      confirmText: "Save",
      cancelText: "Cancel",
      onConfirm: async (value: string) => {
        const newTitle = value.trim() || getDefaultSessionTitle();
        setSessionTitle(newTitle);
        if (currentChatId) {
          try {
            await api.conversation({ id: currentChatId }).patch({ title: newTitle });
          } catch (err) {
            console.error("Failed to rename conversation:", edenError(err));
          }
        }
      },
    });
  };

  const handleDeleteChat = () => {
    openConfirmation({
      title: "Delete conversation?",
      description: "This will clear the current conversation. This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "destructive",
      onConfirm: async () => {
        if (currentChatId) {
          try {
            await api.conversation({ id: currentChatId }).delete();
          } catch (err) {
            console.error("Failed to delete conversation:", edenError(err));
          }
        }
        await createNewConversation();
        setChatKey((k) => k + 1);
      },
    });
  };

  return (
    <div className="flex h-full w-full flex-col">
      <header className="flex shrink-0 items-center gap-2 border-b px-3 py-2.5">
        <span
          className="min-w-0 flex-1 truncate text-sm font-medium"
          title={sessionTitle}
        >
          {sessionTitle}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              aria-label="Conversation options"
            >
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleNewChat}>
              <PlusCircle className="size-4" />
              New chat
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleChangeName}>
              <Pencil className="size-4" />
              Change name
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDeleteChat} className="text-destructive">
              <Trash2 className="size-4" />
              Delete chat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <AdvisorChat
            key={chatKey}
            chatId={currentChatId}
            initialMessages={initialMessages}
          />
        )}
      </div>
    </div>
  );
}
