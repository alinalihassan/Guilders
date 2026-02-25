"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ArrowUp, Check, CopyIcon, RefreshCcw, Sparkles, Square } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Markdown } from "@/components/common/markdown-component";
import { StockCard } from "@/components/generative-ui/stock-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

export default function AdvisorPage() {
  const router = useRouter();
  const { data: user, isLoading } = useUser();
  const { data: token } = useUserToken();
  const isSubscribed = isPro(user);
  const [inputText, setInputText] = useState("");

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${process.env.NEXT_PUBLIC_API_URL}/api/chat`,
      }),
    [],
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
    await sendMessage({ text: trimmedText }, { headers: { Authorization: `Bearer ${token}` } });
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
    const hasStockCardPart = message.parts.some((part) => part.type === "tool-showStockCard");
    return !hasText && !hasStockCardPart;
  };

  const hasMessages = messages.length > 0;

  const AssistantMessageContent = ({
    message,
    loading,
  }: {
    message: (typeof messages)[number];
    loading: boolean;
  }) => {
    const text = getMessageText(message);

    return (
      <div className="space-y-3">
        {text.trim().length > 0 ? <Markdown className="text-sm leading-6">{text}</Markdown> : null}
        {message.parts
          .filter((part) => part.type === "tool-showStockCard")
          .map((part, index) => {
            const toolPart = part as {
              toolCallId?: string;
              state?: string;
              output?: unknown;
            };
            const key = toolPart.toolCallId ?? `stock-card-${index}`;

            if (toolPart.state === "output-available" && isStockCardToolOutput(toolPart.output)) {
              return <StockCard key={key} {...toolPart.output} />;
            }

            if (loading) {
              return (
                <div
                  key={key}
                  className="rounded-xl border border-dashed px-3 py-2 text-sm text-muted-foreground"
                >
                  Preparing stock card...
                </div>
              );
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
        await regenerate({ headers: { Authorization: `Bearer ${token}` } });
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
    return <div className="flex h-[calc(100vh-4rem)] items-center justify-center">Loading...</div>;
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

                    <div className={isUser ? "max-w-[82%]" : "w-full max-w-[88%]"}>
                      <div
                        className={
                          isUser
                            ? "rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground"
                            : "space-y-3 rounded-2xl border bg-background px-4 py-3"
                        }
                      >
                        {isUser ? (
                          <div className="whitespace-pre-wrap">{getMessageText(message)}</div>
                        ) : (
                          <AssistantMessageContent message={message} loading={isGenerating} />
                        )}
                      </div>

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
                  <div className="rounded-2xl border bg-background px-4 py-3 text-sm text-muted-foreground">
                    Thinking...
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
