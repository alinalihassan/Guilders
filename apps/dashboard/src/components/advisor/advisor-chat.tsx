"use client";

import { useChat } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  ArrowUp,
  CopyIcon,
  LayoutDashboard,
  Loader2,
  Lock,
  RefreshCcw,
  Square,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Markdown } from "@/components/common/markdown-component";
import { StockCard } from "@/components/generative-ui/stock-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import { env } from "@/lib/env";
import { useBillingConfig } from "@/lib/queries/useBilling";
import { useChatLimits, useInvalidateChatLimits } from "@/lib/queries/useChatLimits";
import { conversationsKey } from "@/lib/queries/useConversations";
import { useUser, useUserToken } from "@/lib/queries/useUser";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const CHAT_AI_ICONS = [
  { icon: CopyIcon, label: "Copy" },
  { icon: RefreshCcw, label: "Refresh" },
];

const EMPTY_STATE_POINTS = [
  {
    icon: LayoutDashboard,
    text: "View and update your accounts, transactions, categories and more.",
  },
  {
    icon: Lock,
    text: "Secure and private by design — your data stays yours. We don't share your messages with anyone.",
  },
] as const;

const getMessageText = (message: UIMessage) =>
  message.parts
    .filter((part) => part.type === "text")
    .map((part) => ("text" in part ? part.text : ""))
    .join("");

type StockCardToolOutput = {
  accountId: number;
  subtype?: string | null;
  image?: string | null;
  symbol: string;
  accountName: string;
  currency: string;
  value: number;
  cost?: number | null;
  currentValue?: string | null;
  totalChange?: string | null;
};

const isStockCardToolOutput = (value: unknown): value is StockCardToolOutput => {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.accountId === "number" &&
    typeof record.symbol === "string" &&
    typeof record.accountName === "string" &&
    typeof record.currency === "string" &&
    typeof record.value === "number"
  );
};

type ToolPart = {
  type: string;
  state?: string;
  output?: unknown;
};

interface AdvisorChatProps {
  chatId?: string | null;
  initialMessages?: UIMessage[];
}

export function AdvisorChat({ chatId, initialMessages }: AdvisorChatProps) {
  const router = useRouter();
  const { isLoading } = useUser();
  const { isPending: billingConfigPending } = useBillingConfig();
  const { data: limits, refetch: refetchLimits } = useChatLimits();
  const invalidateChatLimits = useInvalidateChatLimits();
  const { data: token } = useUserToken();
  const [inputText, setInputText] = useState("");
  const atLimit = limits != null && limits.remaining <= 0;

  const tokenRef = useRef(token);
  tokenRef.current = token;

  const chatIdRef = useRef(chatId);
  chatIdRef.current = chatId;

  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: `${env.NEXT_PUBLIC_API_URL}/api/chat`,
        headers: (): Record<string, string> => {
          const t = tokenRef.current;
          return t ? { Authorization: `Bearer ${t}` } : {};
        },
        prepareSendMessagesRequest: ({ messages }) => {
          const cid = chatIdRef.current;
          if (!cid) return { body: { messages } };
          return { body: { id: cid, message: messages[messages.length - 1] } };
        },
      }),
  );

  const { messages, sendMessage, regenerate, stop, status } = useChat({
    id: chatId ?? undefined,
    messages: initialMessages,
    transport,
    onError(error) {
      const msg = error.message || "An error occurred. Please try again.";
      if (msg.includes("rate_limit") || msg.includes("all your AI Advisor messages")) {
        toast.error(msg);
        void refetchLimits();
      } else {
        toast.error(msg);
      }
    },
  });

  const isGenerating = status === "submitted" || status === "streaming";
  const messagesRef = useRef<HTMLDivElement>(null);
  const setSessionTitle = useStore((state) => state.setSessionTitle);
  const queryClient = useQueryClient();
  const titleRefreshed = useRef(false);

  useEffect(() => {
    if (!messages.length) return;
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (titleRefreshed.current || !chatId || status !== "ready") return;
    const hasAssistant = messages.some((m) => m.role === "assistant");
    if (!hasAssistant) return;

    titleRefreshed.current = true;
    void (async () => {
      try {
        const { data } = await api.conversation({ id: chatId }).get();
        const conv = data as { title?: string } | null;
        if (conv?.title && conv.title !== "New chat") {
          setSessionTitle(conv.title);
          queryClient.invalidateQueries({ queryKey: conversationsKey });
        }
      } catch {
        // ignore
      }
    })();
  }, [chatId, status, messages, setSessionTitle, queryClient]);

  const sendUserMessage = async (text: string) => {
    const trimmedText = text.trim();
    if (!trimmedText || isGenerating) return;
    if (atLimit) return;
    if (!token) {
      toast.error("Authentication is not ready yet. Please try again.");
      return;
    }
    setInputText("");
    await sendMessage({ text: trimmedText });
    invalidateChatLimits();
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await sendUserMessage(inputText);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (isGenerating || !inputText.trim() || atLimit) return;
      void sendUserMessage(inputText);
    }
  };

  const shouldHideAssistantPlaceholder = (message: (typeof messages)[number], index: number) => {
    if (message.role !== "assistant") return false;
    if (!isGenerating) return false;
    if (index !== messages.length - 1) return false;
    const hasText = getMessageText(message).trim().length > 0;
    const hasStockCard = message.parts.some((part) => part.type === "tool-showStockCard");
    return !hasText && !hasStockCard;
  };

  const hasMessages = messages.length > 0;

  const AssistantMessageText = ({ message }: { message: (typeof messages)[number] }) => {
    const text = getMessageText(message);
    if (text.trim().length === 0) return null;
    return (
      <Markdown
        className={cn(
          "text-sm leading-5",
          "[&_strong]:font-semibold [&_strong]:text-foreground",
          "[&_p]:my-0.5 [&_p]:leading-5",
          "[&_ul]:my-0.5 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:leading-5",
          "[&_ol]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:leading-5",
          "[&_li]:my-0 [&_li]:leading-5",
        )}
      >
        {text}
      </Markdown>
    );
  };

  const AssistantMessageCards = ({
    message,
    loading,
  }: {
    message: (typeof messages)[number];
    loading: boolean;
  }) => {
    const toolParts = message.parts.filter((part) => part.type.startsWith("tool-")) as ToolPart[];
    if (toolParts.length === 0) return null;
    return (
      <div className="mt-3 w-fit space-y-3">
        {toolParts.map((part, index) => {
          const tp = part as ToolPart;
          const key = `tool-${part.type}-${index}`;
          if (part.type === "tool-showStockCard") {
            if (tp.state === "output-available" && isStockCardToolOutput(tp.output)) {
              return <StockCard key={key} {...tp.output} />;
            }
            if (loading) {
              return (
                <div
                  key={key}
                  className="flex items-center gap-2 rounded-xl border border-dashed px-3 py-2 text-sm text-muted-foreground"
                >
                  <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                  <span>Preparing stock card...</span>
                </div>
              );
            }
            return null;
          }
          return null;
        })}
      </div>
    );
  };

  const renderComposer = (className?: string) => (
    <form onSubmit={onSubmit} className={className}>
      {atLimit ? (
        <Card className="space-y-3 border-2 p-4">
          {limits?.tier === "pro" ? (
            <>
              <p className="text-sm text-muted-foreground">
                You&apos;ve used all your Pro AI Advisor messages for this week.
              </p>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => router.push("/settings/subscription")}
              >
                Manage subscription
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                You&apos;ve used all your AI Advisor messages for this week. Upgrade to Pro for
                more.
              </p>
              <Button className="w-full" onClick={() => router.push("/settings/subscription")}>
                Upgrade to Pro
              </Button>
            </>
          )}
        </Card>
      ) : (
        <div className="flex items-end gap-2 rounded-xl border border-border/70 bg-muted/40 p-2 transition-colors focus-within:border-border focus-within:bg-muted/60">
          <textarea
            value={inputText}
            onKeyDown={onKeyDown}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask anything..."
            className="max-h-64 min-h-20 w-full resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          <Button
            type={isGenerating ? "button" : "submit"}
            onClick={isGenerating ? () => stop() : undefined}
            disabled={isGenerating ? false : !token || !inputText.trim() || atLimit}
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full"
          >
            {isGenerating ? (
              <Square className="size-3 fill-current" />
            ) : (
              <ArrowUp className="size-4" />
            )}
            <span className="sr-only">{isGenerating ? "Stop generating" : "Send message"}</span>
          </Button>
        </div>
      )}
    </form>
  );

  const handleActionClick = async (action: string, messageIndex: number) => {
    if (action === "Refresh") {
      if (!token) {
        toast.error("Authentication is not ready yet. Please try again.");
        return;
      }
      try {
        await regenerate();
        invalidateChatLimits();
      } catch {
        toast.error("Couldn't regenerate the response. Please try again.");
      }
    } else if (action === "Copy") {
      const message = messages[messageIndex];
      if (message && message.role === "assistant") {
        const content = getMessageText(message);
        try {
          await navigator.clipboard.writeText(content);
        } catch {
          toast.error("Couldn't copy the response. Please try again.");
        }
      }
    }
  };

  if (isLoading || billingConfigPending) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1 flex-col">
        {hasMessages ? (
          <div ref={messagesRef} className="min-h-0 flex-1 overflow-y-auto">
            <div className="flex w-full flex-col gap-5 px-3 py-6">
              {messages?.map((message, index) => {
                if (shouldHideAssistantPlaceholder(message, index)) return null;
                const isUser = message.role === "user";
                return (
                  <div
                    key={`${message.id}-${index}`}
                    className={isUser ? "flex justify-end" : "flex items-start gap-3"}
                  >
                    {!isUser ? (
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background text-xs">
                        ✦
                      </div>
                    ) : null}
                    <div className={isUser ? "w-fit max-w-[85%]" : "w-full min-w-0"}>
                      {!isUser && getMessageText(message).trim().length > 0 ? (
                        <div className="w-full py-0.5">
                          <AssistantMessageText message={message} />
                        </div>
                      ) : isUser ? (
                        <div className="rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                          <div className="whitespace-pre-wrap">{getMessageText(message)}</div>
                        </div>
                      ) : null}
                      {!isUser && (getMessageText(message).trim().length > 0 || !isGenerating) ? (
                        <AssistantMessageCards message={message} loading={isGenerating} />
                      ) : null}
                      {!isUser && messages.length - 1 === index && !isGenerating ? (
                        <div className="mt-1.5 flex items-center gap-1">
                          {CHAT_AI_ICONS.map((icon) => {
                            const Icon = icon.icon;
                            return (
                              <Button
                                key={icon.label}
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground"
                                onClick={() => handleActionClick(icon.label, index)}
                                type="button"
                              >
                                <Icon className="size-3.5" />
                                <span className="sr-only">{icon.label}</span>
                              </Button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
              {isGenerating ? (
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background text-xs">
                    ✦
                  </div>
                  <div className="flex w-full items-center gap-2 py-0.5 text-sm text-muted-foreground">
                    <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                    <span>Thinking...</span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-8">
            <div className="flex flex-col items-center">
              <h2 className="max-w-[16rem] text-center text-xl font-semibold leading-tight tracking-tight">
                Your advisor is here to help. Just ask.
              </h2>
              <ul className="mt-8 flex w-full max-w-sm flex-col gap-5 text-sm text-muted-foreground">
                {EMPTY_STATE_POINTS.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-3">
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted"
                      aria-hidden
                    >
                      <Icon className="size-5 text-foreground/70" />
                    </span>
                    <span className="leading-snug">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
      <div className="shrink-0 space-y-1 bg-background px-3 py-3">
        {limits != null && (
          <p className="text-center text-xs text-muted-foreground">
            {limits.remaining} of {limits.limit} messages left this week
          </p>
        )}
        {renderComposer()}
        <p className="text-center text-xs text-muted-foreground">
          AI responses are informational only and are not financial advice.
        </p>
      </div>
    </div>
  );
}
