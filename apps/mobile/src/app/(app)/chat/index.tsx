import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { fetch as expoFetch } from 'expo/fetch';
import { useChat } from '@ai-sdk/react';
import { TextStreamChatTransport } from 'ai';

import { Colors, Spacing } from '@/constants/theme';
import { FinanceResponse } from '@/components/chat/finance-response';
import { authClient } from '@/lib/auth-client';

type ColorSet = (typeof Colors)['light'] | (typeof Colors)['dark'];

type MessageType = 'text' | 'finance_summary' | 'spending_chart' | 'account_breakdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type: MessageType;
  data?: any;
  timestamp: Date;
}

// ─── Suggested Prompts ───────────────────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  { icon: '💰', text: 'How much did I spend this month?' },
  { icon: '📊', text: 'Show me my spending by category' },
  { icon: '💳', text: 'What are my largest transactions?' },
  { icon: '📈', text: 'How is my net worth trending?' },
];

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

// ─── Components ──────────────────────────────────────────────────────────────

function SuggestedPrompts({
  colors,
  onSelect,
}: {
  colors: ColorSet;
  onSelect: (text: string) => void;
}) {
  return (
    <View style={{ paddingHorizontal: Spacing.four, gap: Spacing.two }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: '500',
          color: colors.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
          marginBottom: Spacing.one,
        }}>
        Try asking
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
        {SUGGESTED_PROMPTS.map((prompt) => (
          <Pressable
            key={prompt.text}
            onPress={() => onSelect(prompt.text)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: Spacing.one,
              paddingVertical: Spacing.two,
              paddingHorizontal: Spacing.three,
              backgroundColor: pressed ? colors.backgroundSelected : colors.backgroundElement,
              borderRadius: 20,
              borderCurve: 'continuous',
            })}>
            <Text style={{ fontSize: 16 }}>{prompt.icon}</Text>
            <Text style={{ fontSize: 14, color: colors.text }}>{prompt.text}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function MessageBubble({
  message,
  colors,
}: {
  message: Message;
  colors: ColorSet;
}) {
  const isUser = message.role === 'user';

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: Spacing.three,
        paddingHorizontal: Spacing.four,
      }}>
      {!isUser && (
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: '#208AEF',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: Spacing.two,
          }}>
          <Text style={{ fontSize: 16 }}>🤖</Text>
        </View>
      )}

      <View style={{ maxWidth: '75%' }}>
        {message.type === 'text' ? (
          <View
            style={{
              backgroundColor: isUser ? '#208AEF' : colors.backgroundElement,
              paddingVertical: Spacing.two + 4,
              paddingHorizontal: Spacing.three,
              borderRadius: 18,
              borderBottomRightRadius: isUser ? 4 : 18,
              borderBottomLeftRadius: isUser ? 18 : 4,
            }}>
            <Text
              style={{
                fontSize: 15,
                color: isUser ? '#fff' : colors.text,
                lineHeight: 20,
              }}>
              {message.content}
            </Text>
          </View>
        ) : (
          <FinanceResponse type={message.type} data={message.data} colors={colors} />
        )}

        <Text
          style={{
            fontSize: 11,
            color: colors.textSecondary,
            marginTop: Spacing.one,
            alignSelf: isUser ? 'flex-end' : 'flex-start',
          }}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );
}

function ChatInput({
  colors,
  value,
  onChangeText,
  onSend,
  isLoading,
  bottomInset,
}: {
  colors: ColorSet;
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  isLoading: boolean;
  bottomInset: number;
}) {
  const inputRef = useRef<TextInput>(null);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: Spacing.four,
        paddingTop: Spacing.two,
        paddingBottom: bottomInset + Spacing.two,
        gap: Spacing.two,
        backgroundColor: 'transparent',
      }}>
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.backgroundElement,
          borderRadius: 20,
          paddingHorizontal: Spacing.three,
          paddingVertical: Spacing.two,
          maxHeight: 100,
        }}>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder="Ask about your finances..."
          placeholderTextColor={colors.textSecondary}
          multiline
          style={{
            flex: 1,
            fontSize: 15,
            color: colors.text,
            maxHeight: 80,
            paddingTop: 0,
            paddingBottom: 0,
          }}
          onSubmitEditing={onSend}
          blurOnSubmit={false}
        />
      </View>

      <Pressable
        onPress={onSend}
        disabled={!value.trim() || isLoading}
        style={({ pressed }) => ({
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: value.trim() && !isLoading ? '#208AEF' : colors.backgroundSelected,
          justifyContent: 'center',
          alignItems: 'center',
          opacity: pressed && value.trim() && !isLoading ? 0.8 : 1,
        })}>
        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Image
            source="sf:arrow.up"
            style={{
              width: 18,
              height: 18,
              tintColor: value.trim() ? '#fff' : colors.textSecondary,
            }}
          />
        )}
      </Pressable>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  const [inputText, setInputText] = useState('');

  // Create transport with auth headers
  const transport = useMemo(() => {
    const cookies = authClient.getCookie();
    return new TextStreamChatTransport({
      api: `${BASE_URL}/api/chat`,
      fetch: expoFetch as unknown as typeof globalThis.fetch,
      headers: cookies ? { Cookie: cookies } : undefined,
    });
  }, []);

  // Use AI SDK's useChat hook with streaming transport
  const { messages, sendMessage, status } = useChat({
    transport,
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  const scrollToBottom = useCallback(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, []);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;

    setInputText('');
    
    // Send message using AI SDK
    await sendMessage({
      parts: [{ type: 'text', text }],
    });

    // Scroll to bottom after sending
    setTimeout(scrollToBottom, 100);
  }, [inputText, isLoading, sendMessage, scrollToBottom]);

  const handleSuggestedPrompt = useCallback((text: string) => {
    setInputText(text);
    // Auto-send after a brief delay
    setTimeout(() => {
      sendMessage({
        parts: [{ type: 'text', text }],
      });
    }, 100);
  }, [sendMessage]);

  // Convert AI SDK messages to our Message format
  const uiMessages: Message[] = [
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm your AI financial assistant. I can help you understand your spending, track your net worth, and answer questions about your finances. What would you like to know?",
      type: 'text',
      timestamp: new Date(),
    },
    ...messages.map((msg): Message => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content: msg.parts
        .filter((part) => part.type === 'text')
        .map((part) => part.text)
        .join(''),
      type: 'text',
      timestamp: new Date(),
    })),
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + Spacing.four,
          paddingBottom: insets.bottom + 80,
        }}
        onContentSizeChange={scrollToBottom}>
        {uiMessages.length === 1 && (
          <View style={{ marginBottom: Spacing.six }}>
            <SuggestedPrompts colors={colors} onSelect={handleSuggestedPrompt} />
          </View>
        )}

        {uiMessages.map((message) => (
          <MessageBubble key={message.id} message={message} colors={colors} />
        ))}

        {isLoading && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: Spacing.four,
              gap: Spacing.two,
              marginTop: Spacing.two,
            }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#208AEF',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              <Text style={{ fontSize: 16 }}>🤖</Text>
            </View>
            <ActivityIndicator size="small" color={colors.textSecondary} />
          </View>
        )}
      </ScrollView>

      <ChatInput
        colors={colors}
        value={inputText}
        onChangeText={setInputText}
        onSend={handleSend}
        isLoading={isLoading}
        bottomInset={insets.bottom}
      />
    </KeyboardAvoidingView>
  );
}
