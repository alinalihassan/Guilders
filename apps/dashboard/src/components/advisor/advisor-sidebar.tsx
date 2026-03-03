"use client";

import { MoreVertical, Pencil, PlusCircle, Trash2 } from "lucide-react";
import { useState } from "react";

import { AdvisorChat } from "@/components/advisor/advisor-chat";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDialog } from "@/hooks/useDialog";
import { useStore } from "@/lib/store";
import { getDefaultSessionTitle } from "@/lib/store/advisorStore";

export function AdvisorSidebar() {
  const sessionTitle = useStore((state) => state.sessionTitle);
  const setSessionTitle = useStore((state) => state.setSessionTitle);
  const resetSessionTitle = useStore((state) => state.resetSessionTitle);

  const { open: openConfirmation } = useDialog("confirmation");
  const { open: openInputPrompt } = useDialog("inputPrompt");

  const [chatKey, setChatKey] = useState(0);

  const handleNewChat = () => {
    setChatKey((k) => k + 1);
    resetSessionTitle();
  };

  const handleChangeName = () => {
    openInputPrompt({
      title: "Rename conversation",
      description: "Give this conversation a name.",
      placeholder: "Conversation name",
      defaultValue: sessionTitle,
      confirmText: "Save",
      cancelText: "Cancel",
      onConfirm: (value) => setSessionTitle(value.trim() || getDefaultSessionTitle()),
    });
  };

  const handleDeleteChat = () => {
    openConfirmation({
      title: "Delete conversation?",
      description: "This will clear the current conversation. This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "destructive",
      onConfirm: () => {
        setChatKey((k) => k + 1);
        resetSessionTitle();
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
        <AdvisorChat key={chatKey} />
      </div>
    </div>
  );
}
