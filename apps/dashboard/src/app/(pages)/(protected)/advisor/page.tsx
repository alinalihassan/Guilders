"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ArrowUp, Check, CopyIcon, Loader2, RefreshCcw, Sparkles, Square } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Markdown } from "@/components/common/markdown-component";
import { StockCard } from "@/components/generative-ui/stock-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { env } from "@/lib/env";
import { useUser, useUserToken } from "@/lib/queries/useUser";
import { isPro } from "@/lib/utils";

const ChatAiIcons = [
  {
    icon: CopyIcon,
    label: "Copy",
  },
  {
    icon: RefreshCcw,
    label: "Refresh",
  },
];

const ExampleQuestions = [
  "What's my current spending this month?",
  "How much did I save last month?",
  "What's my biggest expense category?",
  "How can I improve my savings?",
  "Show me my investment breakdown",
  "What's my net worth?",
  "How can I adjust my portfolio?",
];

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

export default function AdvisorPage() {
  const router = useRouter();
  const { data: user, isLoading } = useUser();
  const { data: token } = useUserToken();
  const isSubscribed = isPro(user);
  const [inputText, setInputText] = useState("");

  const tokenRef = useRef(token);
  tokenRef.current = token;

  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: `${env.NEXT_PUBLIC_API_URL}/api/chat`,
        headers: (): Record<string, string> => {
          const t = tokenRef.current;
          return t ? { Authorization: `Bearer ${t}` } : {};
        },
      }),
  );

  const { messages, sendMessage, regenerate, stop, status } = useChat({
    transport,
    onError(error) {
      toast.error(error.message || "An error occurred. Please try again.");
    },
  });

  const isGenerating = status === "submitted" || status === "streaming";

  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!messages.length) return;
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  const sendUserMessage = async (text: string) => {
    const trimmedText = text.trim();
    if (!trimmedText || isGenerating) return;
    if (!token) {
      toast.error("Authentication is not ready yet. Please try again.");
      return;
    }

    setInputText("");
    await sendMessage({ text: trimmedText });
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await sendUserMessage(inputText);
  };

  const handleExampleClick = (question: string) => {
    if (isGenerating) return;
    void sendUserMessage(question);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (isGenerating || !inputText.trim()) return;
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
    return <Markdown className="text-sm leading-6">{text}</Markdown>;
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
      <div className="shadow-xs rounded-2xl border bg-background p-2 transition-shadow focus-within:shadow-sm">
        <textarea
          value={inputText}
          onKeyDown={onKeyDown}
          onChange={(event) => setInputText(event.target.value)}
          placeholder="Ask me anything about your finances..."
          className="max-h-52 min-h-12 w-full resize-none bg-transparent px-3 py-2 text-[15px] outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center gap-2 px-2 pb-1">
          <Button
            type={isGenerating ? "button" : "submit"}
            onClick={isGenerating ? () => stop() : undefined}
            disabled={isGenerating ? false : !token || !inputText.trim()}
            size="icon"
            className="ml-auto h-8 w-8 rounded-full"
          >
            {isGenerating ? (
              <Square className="size-3.5 fill-current" />
            ) : (
              <ArrowUp className="size-4" />
            )}
            <span className="sr-only">{isGenerating ? "Stop generating" : "Send message"}</span>
          </Button>
        </div>
      </div>
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
      } catch {
        toast.error("Couldn't regenerate the response. Please try again.");
      }
    } else if (action === "Copy") {
      const message = messages[messageIndex];
      if (message && message.role === "assistant") {
        const content = getMessageText(message);
        navigator.clipboard.writeText(content);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex h-[calc(100vh-4rem)] w-full max-w-5xl flex-col px-4">
      {!isSubscribed && (
        <div className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
          <Card className="max-w-md space-y-4 border-2 p-6 shadow-lg">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Unlock Your AI Advisor</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Get personalized financial insights and advice with your Pro subscription.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span className="text-sm">Analyze your spending patterns</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span className="text-sm">Get investment recommendations</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span className="text-sm">Track your financial goals</span>
              </div>
            </div>

            <Button className="w-full" onClick={() => router.push("/settings/subscription")}>
              Upgrade to Pro
            </Button>
          </Card>
        </div>
      )}

      <div className="min-h-0 flex-1">
        {hasMessages ? (
          <div ref={messagesRef} className="h-full overflow-y-auto">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-3 py-6">
              {messages?.map((message, index) => {
                if (shouldHideAssistantPlaceholder(message, index)) return null;
                const isUser = message.role === "user";

                return (
                  <div
                    key={message.id}
                    className={isUser ? "flex justify-end" : "flex items-start gap-3"}
                  >
                    {!isUser ? (
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background text-xs">
                        ✦
                      </div>
                    ) : null}

                    <div className="w-fit max-w-2xl">
                      {!isUser && getMessageText(message).trim().length > 0 ? (
                        <div className="rounded-2xl border bg-background px-4 py-3">
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
                          {ChatAiIcons.map((icon) => {
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
                  <div className="flex items-center gap-2 rounded-2xl border bg-background px-4 py-3 text-sm text-muted-foreground">
                    <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                    <span>Thinking...</span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="mx-auto flex h-full w-full max-w-3xl flex-col items-center justify-center gap-7">
            <div className="space-y-2 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background">
                <Sparkles className="size-5" />
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">
                What would you like to know?
              </h1>
              <p className="mx-auto max-w-xl text-sm text-muted-foreground">
                Ask about spending, savings, investments, or your net worth.
              </p>
            </div>

            <div className="w-full max-w-2xl space-y-3">
              {renderComposer()}
              <div className="flex flex-wrap justify-center gap-2">
                {ExampleQuestions.map((question) => (
                  <Badge
                    key={question}
                    variant="outline"
                    className="cursor-pointer rounded-full bg-background px-3 py-1.5 text-xs hover:bg-secondary/80"
                    onClick={() => handleExampleClick(question)}
                  >
                    {question}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      {hasMessages && (
        <div className="sticky bottom-0 mx-auto w-full max-w-4xl bg-gradient-to-t from-background px-2 pb-4 pt-2">
          {renderComposer()}
        </div>
      )}
    </div>
  );
}
