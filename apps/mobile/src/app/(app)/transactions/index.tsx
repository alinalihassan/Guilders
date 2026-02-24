import { router } from "expo-router";
import { useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors, Spacing } from "@/constants/theme";
import { type Transaction, useTransactions } from "@/hooks/use-dashboard";

type ColorSet = (typeof Colors)["light"] | (typeof Colors)["dark"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTransactionAmount(amount: string, currency: string): string {
  const num = parseFloat(amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: "always",
  }).format(num);
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getCategoryIcon(category: string): string {
  const map: Record<string, string> = {
    food: "🍔",
    transport: "🚗",
    shopping: "🛍️",
    entertainment: "🎬",
    health: "🏥",
    travel: "✈️",
    utilities: "💡",
    income: "💰",
    transfer: "↔️",
    uncategorized: "📋",
  };
  return map[category.toLowerCase()] ?? "📋";
}

// ─── Components ──────────────────────────────────────────────────────────────

function TransactionRow({
  item,
  colors,
  isLast,
}: {
  item: Transaction;
  colors: ColorSet;
  isLast: boolean;
}) {
  const amount = parseFloat(item.amount);
  const isPositive = amount >= 0;
  const formattedAmount = formatTransactionAmount(item.amount, item.currency);

  return (
    <Pressable
      onPress={() => router.push(`/transaction/${item.id}`)}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: Spacing.three,
        paddingHorizontal: Spacing.three,
        borderBottomWidth: isLast ? 0 : 0.5,
        borderBottomColor: colors.backgroundSelected,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      {/* Icon */}
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.backgroundSelected,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 18 }}>{getCategoryIcon(item.category)}</Text>
      </View>

      {/* Middle: Description and Date */}
      <View style={{ flex: 1, marginLeft: Spacing.three }}>
        <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: "500", color: colors.text }}>
          {item.description}
        </Text>
        <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
          {formatDateShort(item.date)}
        </Text>
      </View>

      {/* Right: Amount */}
      <Text
        style={{
          fontSize: 16,
          fontWeight: "600",
          color: isPositive ? "#22C55E" : colors.text,
          fontVariant: ["tabular-nums"],
          marginLeft: Spacing.three,
        }}
      >
        {formattedAmount}
      </Text>
    </Pressable>
  );
}

function EmptyTransactions({ colors }: { colors: ColorSet }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: Spacing.six, gap: Spacing.two }}>
      <Text style={{ fontSize: 32 }}>📭</Text>
      <Text style={{ fontSize: 15, color: colors.textSecondary }}>No transactions yet</Text>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function TransactionsScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];
  const insets = useSafeAreaInsets();

  const { data: transactions, loading, refetch } = useTransactions();

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={onRefresh}
          tintColor={colors.textSecondary}
        />
      }
      contentContainerStyle={{
        paddingHorizontal: Spacing.four,
        paddingBottom: insets.bottom + Spacing.six,
      }}
    >
      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.textSecondary}
          style={{ marginTop: Spacing.six }}
        />
      ) : transactions.length === 0 ? (
        <EmptyTransactions colors={colors} />
      ) : (
        <View
          style={{
            backgroundColor: colors.backgroundElement,
            borderRadius: 16,
            overflow: "hidden",
            marginTop: Spacing.two,
          }}
        >
          {transactions.map((item, index) => (
            <TransactionRow
              key={item.id}
              item={item}
              colors={colors}
              isLast={index === transactions.length - 1}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}
