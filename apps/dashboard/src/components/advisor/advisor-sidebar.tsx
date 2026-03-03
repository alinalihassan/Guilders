"use client";

import type { UIMessage } from "ai";
import { formatDistanceToNow } from "date-fns";
import { ChevronsUpDown, Loader2, MoreVertical, Pencil, PlusCircle, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { AdvisorChat } from "@/components/advisor/advisor-chat";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDialog } from "@/hooks/useDialog";
import { edenError } from "@/lib/api";
import {
  useConversation,
  useConversations,
  useCreateConversation,
  useDeleteConversation,
  useLastConversation,
  useRenameConversation,
} from "@/lib/queries/useConversations";
import { useStore } from "@/lib/store";
import { getDefaultSessionTitle } from "@/lib/store/advisorStore";
import { cn } from "@/lib/utils";

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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);

  const { data: lastConversation, isLoading: loadingLast } = useLastConversation();
  const { data: conversations, isLoading: loadingList } = useConversations(pickerOpen);
  const { data: selectedConversation } = useConversation(selectedConvId);

  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation();
  const renameConversation = useRenameConversation();

  const createConversationRef = useRef(createConversation);
  createConversationRef.current = createConversation;

  const applyConversation = useCallback(
    (conv: { id: string; title: string; messages?: unknown[] }) => {
      setCurrentChat(conv.id, conv.title, (conv.messages ?? []) as UIMessage[]);
      setChatKey((k) => k + 1);
    },
    [setCurrentChat],
  );

  // Load last conversation (or create one) on mount
  useEffect(() => {
    if (loadingLast || currentChatId) return;

    if (lastConversation) {
      setCurrentChat(
        lastConversation.id,
        lastConversation.title,
        lastConversation.messages as UIMessage[],
      );
    } else {
      createConversationRef.current.mutate(undefined, {
        onSuccess: (conv) => setCurrentChat(conv.id, conv.title, []),
      });
    }
  }, [loadingLast, lastConversation, currentChatId, setCurrentChat]);

  // When a conversation is selected from the picker, load it
  useEffect(() => {
    if (!selectedConvId || !selectedConversation) return;
    applyConversation(selectedConversation);
    setSelectedConvId(null);
  }, [selectedConversation, selectedConvId, applyConversation]);

  const handleSelectConversation = (convId: string) => {
    setPickerOpen(false);
    if (convId === currentChatId) return;
    setSelectedConvId(convId);
  };

  const handleNewChat = () => {
    createConversation.mutate(undefined, {
      onSuccess: (conv) => applyConversation(conv),
    });
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
            await renameConversation.mutateAsync({ id: currentChatId, title: newTitle });
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
        if (!currentChatId) return;
        try {
          await deleteConversation.mutateAsync(currentChatId);
        } catch (err) {
          console.error("Failed to delete conversation:", edenError(err));
        }
        clearChat();

        const remaining = (conversations ?? []).filter((c) => c.id !== currentChatId);
        const next = remaining[0];
        if (next) {
          handleSelectConversation(next.id);
        } else {
          createConversation.mutate(undefined, {
            onSuccess: (conv) => applyConversation(conv),
          });
        }
      },
    });
  };

  return (
    <div className="flex h-full w-full flex-col">
      <header className="flex shrink-0 items-center gap-1 border-b px-2 py-2">
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 min-w-0 flex-1 justify-between gap-1 px-2 text-sm font-medium"
            >
              <span className="truncate">{sessionTitle}</span>
              <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[360px] p-0" align="start" sideOffset={6}>
            <div className="border-b px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground">Conversations</p>
            </div>
            <ScrollArea className="max-h-72">
              {loadingList ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              ) : !conversations || conversations.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No conversations yet
                </p>
              ) : (
                <div className="p-1">
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => handleSelectConversation(conv.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent",
                        conv.id === currentChatId && "bg-accent",
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">{conv.title}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>
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
        {!currentChatId ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <AdvisorChat key={chatKey} chatId={currentChatId} initialMessages={initialMessages} />
        )}
      </div>
    </div>
  );
}
