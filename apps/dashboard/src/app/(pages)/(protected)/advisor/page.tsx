"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useJsonRenderMessage } from "@json-render/react";
import {
	ArrowUp,
	Check,
	CopyIcon,
	Mic,
	Paperclip,
	RefreshCcw,
	Sparkles,
	Square,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Markdown } from "@/components/common/markdown-component";
import { APPROVED_COMPONENT_TYPES } from "@/lib/advisor/render/catalog";
import { AdvisorJsonRenderer } from "@/lib/advisor/render/renderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	ChatBubble,
	ChatBubbleAction,
	ChatBubbleAvatar,
	ChatBubbleMessage,
} from "@/components/ui/chat-bubble";
import { ChatInput } from "@/components/ui/chat-input";
import { ChatMessageList } from "@/components/ui/chat-message-list";
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
			console.error("Chat error:", error);
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
		await sendMessage(
			{ text: trimmedText },
			{ headers: { Authorization: `Bearer ${token}` } },
		);
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

	const getMessageText = (message: (typeof messages)[number]) =>
		message.parts
			.filter((part) => part.type === "text")
			.map((part) => ("text" in part ? part.text : ""))
			.join("");

	const AssistantMessageContent = ({
		message,
		isGenerating,
	}: {
		message: (typeof messages)[number];
		isGenerating: boolean;
	}) => {
		const { spec, text } = useJsonRenderMessage(message.parts);
		const approvedSpec = isApprovedSpec(spec) ? spec : null;

		return (
			<div className="space-y-3">
				{(text || "").trim().length > 0 ? <Markdown>{text}</Markdown> : null}
				{approvedSpec ? (
					<AdvisorJsonRenderer spec={approvedSpec} loading={isGenerating} />
				) : null}
			</div>
		);
	};

	const isApprovedSpec = (spec: unknown): boolean => {
		if (!spec || typeof spec !== "object") return false;
		const specObj = spec as {
			elements?: Record<string, { type?: string }>;
		};
		const elements = specObj.elements;
		if (!elements) return false;

		return Object.values(elements).every((element) =>
			APPROVED_COMPONENT_TYPES.includes(
				(element?.type ?? "") as (typeof APPROVED_COMPONENT_TYPES)[number],
			),
		);
	};

	const shouldHideAssistantPlaceholder = (
		message: (typeof messages)[number],
		index: number,
	) => {
		if (message.role !== "assistant") return false;
		if (!isGenerating) return false;
		if (index !== messages.length - 1) return false;
		const hasText = getMessageText(message).trim().length > 0;
		const hasSpecPart = message.parts.some((part) => part.type === "data-spec");
		return !hasText && !hasSpecPart;
	};

	const hasMessages = messages.length > 0;

	const renderComposer = (className?: string) => (
		<form onSubmit={onSubmit} className={className}>
			<div className="rounded-[26px] border bg-background/95 shadow-sm backdrop-blur-xl transition-shadow focus-within:shadow-md">
				<ChatInput
					value={inputText}
					onKeyDown={onKeyDown}
					onChange={(event) => setInputText(event.target.value)}
					placeholder="Ask me anything about your finances..."
					className="min-h-14 resize-none rounded-[26px] border-0 bg-transparent px-5 pt-4 pb-2 text-[15px] focus-visible:ring-0 focus-visible:ring-offset-0"
				/>
				<div className="flex items-center gap-2 px-3 pb-3">
					<div className="flex items-center gap-1 rounded-full border bg-muted/40 px-1.5 py-1">
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="h-7 w-7 rounded-full text-muted-foreground"
						>
							<Paperclip className="size-3.5" />
							<span className="sr-only">Attach file</span>
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="h-7 w-7 rounded-full text-muted-foreground"
						>
							<Mic className="size-3.5" />
							<span className="sr-only">Use Microphone</span>
						</Button>
					</div>

					<Button
						type={isGenerating ? "button" : "submit"}
						onClick={isGenerating ? () => stop() : undefined}
						disabled={isGenerating ? false : !token || !inputText.trim()}
						size="icon"
						className="ml-auto h-9 w-9 rounded-full"
					>
						{isGenerating ? (
							<Square className="size-3.5 fill-current" />
						) : (
							<ArrowUp className="size-4" />
						)}
						<span className="sr-only">
							{isGenerating ? "Stop generating" : "Send message"}
						</span>
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
			} catch (error) {
				console.error("Error reloading:", error);
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
			<div className="flex items-center justify-center h-[calc(100vh-4rem)]">
				Loading...
			</div>
		);
	}

	return (
		<div className="relative mx-auto flex h-[calc(100vh-4rem)] w-full max-w-5xl flex-col px-4">
			{!isSubscribed && (
				<div className="absolute inset-0 z-50 backdrop-blur-sm flex items-center justify-center">
					<Card className="max-w-md p-6 space-y-4 shadow-lg border-2">
						<div className="space-y-2">
							<div className="flex items-center gap-2">
								<Sparkles className="h-5 w-5 text-primary" />
								<h2 className="text-xl font-semibold">
									Unlock Your AI Advisor
								</h2>
							</div>
							<p className="text-sm text-muted-foreground">
								Get personalized financial insights and advice with your Pro
								subscription.
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

						<Button
							className="w-full"
							onClick={() => router.push("/settings/subscription")}
						>
							Upgrade to Pro
						</Button>
					</Card>
				</div>
			)}

			<div className="min-h-0 flex-1">
				{hasMessages ? (
					<div className="h-full overflow-y-auto">
						<ChatMessageList
							ref={messagesRef}
							className="mx-auto w-full max-w-4xl px-2 pt-6"
						>
							{messages?.map((message, index) => {
								if (shouldHideAssistantPlaceholder(message, index)) return null;
								return (
									<ChatBubble
										key={message.id}
										variant={message.role === "user" ? "sent" : "received"}
										className="max-w-[85%]"
									>
										<ChatBubbleAvatar
											src={message.role === "user" ? "/assets/user.png" : ""}
											fallback={message.role === "user" ? "👨🏽" : "✦"}
										/>
										<ChatBubbleMessage className="rounded-2xl">
											{message.role === "assistant" ? (
												<AssistantMessageContent
													message={message}
													isGenerating={isGenerating}
												/>
											) : (
												getMessageText(message)
											)}

											{message.role === "assistant" &&
												messages.length - 1 === index && (
													<div className="mt-1.5 flex items-center gap-1">
														{!isGenerating &&
															ChatAiIcons.map((icon) => {
																const Icon = icon.icon;
																return (
																	<ChatBubbleAction
																		className="size-5"
																		key={icon.label}
																		icon={<Icon className="size-3" />}
																		onClick={() =>
																			handleActionClick(icon.label, index)
																		}
																	/>
																);
															})}
													</div>
												)}
										</ChatBubbleMessage>
									</ChatBubble>
								);
							})}

							{isGenerating && (
								<ChatBubble variant="received" className="max-w-[85%]">
									<ChatBubbleAvatar src="" fallback="✦" />
									<ChatBubbleMessage isLoading className="rounded-2xl" />
								</ChatBubble>
							)}
						</ChatMessageList>
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
				<div className="sticky bottom-0 mx-auto w-full max-w-4xl pb-4 pt-2">
					{renderComposer()}
				</div>
			)}
		</div>
	);
}
