import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors, Fonts, Spacing } from "@/constants/theme";
import type { Transaction } from "@/hooks/use-dashboard";
import { api } from "@/lib/api";

type ColorSet = (typeof Colors)["light"] | (typeof Colors)["dark"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(value: number, currency = "EUR"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: "always",
  }).format(value);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getCategoryIcon(): string {
  return "📋";
}

// ─── Components ──────────────────────────────────────────────────────────────

function DetailRow({
  label,
  value,
  colors,
  icon,
  isLast = false,
}: {
  label: string;
  value: string;
  colors: ColorSet;
  icon?: string;
  isLast?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: Spacing.three,
        borderBottomWidth: isLast ? 0 : 0.5,
        borderBottomColor: colors.backgroundElement,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.two }}>
        {icon && <Text style={{ fontSize: 16 }}>{icon}</Text>}
        <Text style={{ fontSize: 15, color: colors.textSecondary }}>{label}</Text>
      </View>
      <Text
        style={{
          fontSize: 15,
          fontWeight: "500",
          color: colors.text,
          fontVariant: ["tabular-nums"],
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  colors,
  variant = "secondary",
}: {
  icon: string;
  label: string;
  onPress: () => void;
  colors: ColorSet;
  variant?: "primary" | "secondary";
}) {
  const isPrimary = variant === "primary";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: Spacing.one,
        paddingVertical: Spacing.two + 4,
        paddingHorizontal: Spacing.three,
        borderRadius: 24,
        backgroundColor: isPrimary ? colors.text : colors.backgroundElement,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Image
        source={`sf:${icon}`}
        style={{
          width: 16,
          height: 16,
          tintColor: isPrimary ? colors.background : colors.text,
        }}
      />
      <Text
        style={{
          fontSize: 14,
          fontWeight: "600",
          color: isPrimary ? colors.background : colors.text,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];
  const insets = useSafeAreaInsets();

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransaction = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);
    try {
      const result = await api.get<Transaction>(`/api/transaction/${id}`);
      setTransaction(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load transaction");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTransaction();
  }, [fetchTransaction]);

  const amount = transaction ? parseFloat(transaction.amount) : 0;
  const isPositive = amount >= 0;

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={colors.textSecondary} />
      </View>
    );
  }

  if (error || !transaction) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: "center",
          alignItems: "center",
          padding: Spacing.four,
        }}
      >
        <Text style={{ fontSize: 48, marginBottom: Spacing.two }}>⚠️</Text>
        <Text style={{ fontSize: 16, color: colors.text, textAlign: "center" }}>
          {error || "Transaction not found"}
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={{
            marginTop: Spacing.four,
            paddingVertical: Spacing.two,
            paddingHorizontal: Spacing.four,
            backgroundColor: colors.backgroundElement,
            borderRadius: 12,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          padding: Spacing.four,
          backgroundColor: colors.background,
        }}
      >
        {/* Top row: close button */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: Spacing.four,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors.backgroundElement,
              justifyContent: "center",
              alignItems: "center",
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Image source="sf:xmark" style={{ width: 16, height: 16, tintColor: colors.text }} />
          </Pressable>

          <Pressable
            onPress={() => {}}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors.backgroundElement,
              justifyContent: "center",
              alignItems: "center",
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Image source="sf:ellipsis" style={{ width: 16, height: 16, tintColor: colors.text }} />
          </Pressable>
        </View>

        {/* Category Icon */}
        <View style={{ alignItems: "center", marginBottom: Spacing.three }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: colors.backgroundElement,
              justifyContent: "center",
              alignItems: "center",
              marginBottom: Spacing.three,
            }}
          >
            <Text style={{ fontSize: 32 }}>{getCategoryIcon()}</Text>
          </View>

          {/* Description */}
          <Text
            style={{
              fontSize: 17,
              fontWeight: "600",
              color: colors.text,
              textAlign: "center",
              marginBottom: Spacing.one,
            }}
          >
            {transaction.description}
          </Text>

          {/* Category */}
          <Text
            style={{
              fontSize: 13,
              color: colors.textSecondary,
              textTransform: "capitalize",
            }}
          >
            Category #{transaction.category_id}
          </Text>
        </View>

        {/* Amount */}
        <View style={{ alignItems: "center" }}>
          <Text
            style={{
              fontSize: 48,
              fontWeight: "700",
              color: isPositive ? "#22C55E" : colors.text,
              fontFamily: Fonts?.rounded,
              fontVariant: ["tabular-nums"],
              letterSpacing: -1,
            }}
          >
            {formatCurrency(amount, transaction.currency)}
          </Text>

          {/* Date */}
          <Text
            style={{
              fontSize: 15,
              color: colors.textSecondary,
              marginTop: Spacing.one,
            }}
          >
            {formatDate(transaction.date)} at {formatTime(transaction.date)}
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: Spacing.four,
          paddingBottom: insets.bottom + Spacing.six,
        }}
      >
        {/* Action Buttons */}
        <View
          style={{
            flexDirection: "row",
            gap: Spacing.two,
            marginBottom: Spacing.four,
          }}
        >
          <ActionButton
            icon="square.and.pencil"
            label="Edit"
            onPress={() => {}}
            colors={colors}
            variant="secondary"
          />
          <ActionButton
            icon="doc.on.doc"
            label="Duplicate"
            onPress={() => {}}
            colors={colors}
            variant="secondary"
          />
          <ActionButton
            icon="trash"
            label="Delete"
            onPress={() => {}}
            colors={colors}
            variant="secondary"
          />
        </View>

        {/* Details Card */}
        <View
          style={{
            backgroundColor: colors.backgroundElement,
            borderRadius: 16,
            padding: Spacing.three,
            marginBottom: Spacing.three,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: colors.textSecondary,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: Spacing.two,
            }}
          >
            Details
          </Text>

          <DetailRow label="Status" value="Completed" icon="✓" colors={colors} />
          <DetailRow
            label="Account ID"
            value={`#${transaction.account_id}`}
            icon="💳"
            colors={colors}
          />
          <DetailRow
            label="Transaction ID"
            value={`#${transaction.id}`}
            icon="#"
            colors={colors}
            isLast
          />
        </View>

        {/* Additional Info */}
        <View
          style={{
            backgroundColor: colors.backgroundElement,
            borderRadius: 16,
            padding: Spacing.three,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: colors.textSecondary,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: Spacing.two,
            }}
          >
            Additional Information
          </Text>

          <DetailRow label="Currency" value={transaction.currency} icon="💱" colors={colors} />
          <DetailRow
            label="Raw Amount"
            value={transaction.amount}
            icon="🔢"
            colors={colors}
            isLast
          />
        </View>
      </ScrollView>
    </View>
  );
}
