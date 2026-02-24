import { Image } from "expo-image";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors, Fonts, Spacing } from "@/constants/theme";
import type { Account } from "@/hooks/use-dashboard";
import { api } from "@/lib/api";

type ColorSet = (typeof Colors)["light"] | (typeof Colors)["dark"];

// ─── Types ───────────────────────────────────────────────────────────────────

type TransactionType = "expense" | "income";

interface TransactionFormData {
  accountId: number | null;
  amount: string;
  currency: string;
  date: string;
  description: string;
  category: string;
  type: TransactionType;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: "food", label: "Food & Dining", icon: "🍔" },
  { value: "transport", label: "Transport", icon: "🚗" },
  { value: "shopping", label: "Shopping", icon: "🛍️" },
  { value: "entertainment", label: "Entertainment", icon: "🎬" },
  { value: "health", label: "Health", icon: "🏥" },
  { value: "travel", label: "Travel", icon: "✈️" },
  { value: "utilities", label: "Utilities", icon: "💡" },
  { value: "income", label: "Income", icon: "💰" },
  { value: "transfer", label: "Transfer", icon: "↔️" },
  { value: "uncategorized", label: "Uncategorized", icon: "📋" },
];

const CURRENCIES = ["USD", "EUR", "GBP", "CHF", "JPY"];

function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ─── Components ──────────────────────────────────────────────────────────────

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  colors,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "email-address";
  colors: ColorSet;
}) {
  return (
    <View style={{ marginBottom: Spacing.three }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: colors.textSecondary,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          marginBottom: Spacing.one,
        }}
      >
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        keyboardType={keyboardType}
        style={{
          fontSize: 16,
          color: colors.text,
          paddingVertical: Spacing.two,
          paddingHorizontal: Spacing.three,
          backgroundColor: colors.backgroundElement,
          borderRadius: 12,
        }}
      />
    </View>
  );
}

function AccountSelector({
  accounts,
  selected,
  onSelect,
  colors,
}: {
  accounts: Account[];
  selected: number | null;
  onSelect: (accountId: number) => void;
  colors: ColorSet;
}) {
  if (accounts.length === 0) {
    return (
      <View style={{ marginBottom: Spacing.three }}>
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
          Account
        </Text>
        <View
          style={{
            padding: Spacing.three,
            backgroundColor: colors.backgroundElement,
            borderRadius: 12,
          }}
        >
          <Text style={{ fontSize: 14, color: colors.textSecondary }}>
            No accounts available. Create an account first.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: Spacing.three }}>
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
        Account
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: Spacing.two }}
      >
        {accounts.map((account) => (
          <Pressable
            key={account.id}
            onPress={() => onSelect(account.id)}
            style={({ pressed }) => ({
              paddingVertical: Spacing.two,
              paddingHorizontal: Spacing.three,
              backgroundColor: selected === account.id ? colors.text : colors.backgroundElement,
              borderRadius: 12,
              opacity: pressed ? 0.8 : 1,
              minWidth: 100,
            })}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: selected === account.id ? "600" : "400",
                color: selected === account.id ? colors.background : colors.text,
              }}
            >
              {account.name}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: selected === account.id ? colors.background : colors.textSecondary,
                marginTop: 2,
              }}
            >
              {account.currency}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function TransactionTypeSelector({
  selected,
  onSelect,
  colors,
}: {
  selected: TransactionType;
  onSelect: (type: TransactionType) => void;
  colors: ColorSet;
}) {
  return (
    <View style={{ marginBottom: Spacing.three }}>
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
        Transaction Type
      </Text>
      <View style={{ flexDirection: "row", gap: Spacing.two }}>
        <Pressable
          onPress={() => onSelect("expense")}
          style={({ pressed }) => ({
            flex: 1,
            paddingVertical: Spacing.two,
            paddingHorizontal: Spacing.three,
            backgroundColor: selected === "expense" ? "#EF4444" : colors.backgroundElement,
            borderRadius: 12,
            opacity: pressed ? 0.8 : 1,
            alignItems: "center",
          })}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: selected === "expense" ? "600" : "400",
              color: selected === "expense" ? "#fff" : colors.text,
            }}
          >
            Expense
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onSelect("income")}
          style={({ pressed }) => ({
            flex: 1,
            paddingVertical: Spacing.two,
            paddingHorizontal: Spacing.three,
            backgroundColor: selected === "income" ? "#22C55E" : colors.backgroundElement,
            borderRadius: 12,
            opacity: pressed ? 0.8 : 1,
            alignItems: "center",
          })}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: selected === "income" ? "600" : "400",
              color: selected === "income" ? "#fff" : colors.text,
            }}
          >
            Income
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function CurrencySelector({
  selected,
  onSelect,
  colors,
}: {
  selected: string;
  onSelect: (currency: string) => void;
  colors: ColorSet;
}) {
  return (
    <View style={{ marginBottom: Spacing.three }}>
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
        Currency
      </Text>
      <View style={{ flexDirection: "row", gap: Spacing.two }}>
        {CURRENCIES.map((currency) => (
          <Pressable
            key={currency}
            onPress={() => onSelect(currency)}
            style={({ pressed }) => ({
              paddingVertical: Spacing.two,
              paddingHorizontal: Spacing.three,
              backgroundColor: selected === currency ? colors.text : colors.backgroundElement,
              borderRadius: 12,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: selected === currency ? "600" : "400",
                color: selected === currency ? colors.background : colors.text,
              }}
            >
              {currency}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function CategorySelector({
  selected,
  onSelect,
  colors,
}: {
  selected: string;
  onSelect: (category: string) => void;
  colors: ColorSet;
}) {
  return (
    <View style={{ marginBottom: Spacing.three }}>
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
        Category
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: Spacing.two }}>
        {CATEGORIES.map((category) => (
          <Pressable
            key={category.value}
            onPress={() => onSelect(category.value)}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: Spacing.one,
              paddingVertical: Spacing.two,
              paddingHorizontal: Spacing.three,
              backgroundColor: selected === category.value ? colors.text : colors.backgroundElement,
              borderRadius: 24,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ fontSize: 16 }}>{category.icon}</Text>
            <Text
              style={{
                fontSize: 14,
                fontWeight: selected === category.value ? "600" : "400",
                color: selected === category.value ? colors.background : colors.text,
              }}
            >
              {category.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function CreateTransactionScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];
  const insets = useSafeAreaInsets();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);

  const [formData, setFormData] = useState<TransactionFormData>({
    accountId: null,
    amount: "",
    currency: "EUR",
    date: formatDateForInput(new Date()),
    description: "",
    category: "uncategorized",
    type: "expense",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch accounts on mount
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const accountsResult = await api.get<Account[]>("/api/account");
        setAccounts(accountsResult);
        // Auto-select first account if available
        if (accountsResult.length > 0) {
          setFormData((prev) => ({
            ...prev,
            accountId: accountsResult[0].id,
            currency: accountsResult[0].currency,
          }));
        }
      } catch {
        setError("Failed to load accounts");
      } finally {
        setAccountsLoading(false);
      }
    };
    fetchAccounts();
  }, []);

  const updateField = useCallback(
    <K extends keyof TransactionFormData>(field: K, value: TransactionFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleAccountSelect = useCallback(
    (accountId: number) => {
      const selectedAccount = accounts.find((a) => a.id === accountId);
      setFormData((prev) => ({
        ...prev,
        accountId,
        currency: selectedAccount?.currency || prev.currency,
      }));
    },
    [accounts],
  );

  const handleSubmit = useCallback(async () => {
    if (!formData.accountId) {
      setError("Please select an account");
      return;
    }

    if (!formData.amount.trim() || isNaN(parseFloat(formData.amount))) {
      setError("Please enter a valid amount");
      return;
    }

    if (!formData.description.trim()) {
      setError("Please enter a description");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Convert amount based on transaction type (negative for expense)
      const rawAmount = parseFloat(formData.amount);
      const finalAmount = formData.type === "expense" ? -Math.abs(rawAmount) : Math.abs(rawAmount);

      await api.post("/api/transaction", {
        account_id: formData.accountId,
        amount: finalAmount,
        currency: formData.currency,
        date: formData.date,
        description: formData.description.trim(),
        category: formData.category,
      });

      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create transaction");
    } finally {
      setIsSubmitting(false);
    }
  }, [formData]);

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
        </View>

        {/* Title */}
        <Text
          style={{
            fontSize: 28,
            fontWeight: "700",
            color: colors.text,
            fontFamily: Fonts?.rounded,
          }}
        >
          Add Transaction
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: colors.textSecondary,
            marginTop: Spacing.one,
          }}
        >
          Record a new transaction
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: Spacing.four,
          paddingBottom: insets.bottom + Spacing.six,
        }}
      >
        {/* Form */}
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
            Transaction Details
          </Text>

          {/* Asset Selector */}
          {accountsLoading ? (
            <ActivityIndicator color={colors.textSecondary} />
          ) : (
            <AccountSelector
              accounts={accounts}
              selected={formData.accountId}
              onSelect={handleAccountSelect}
              colors={colors}
            />
          )}

          {/* Transaction Type */}
          <TransactionTypeSelector
            selected={formData.type}
            onSelect={(type) => updateField("type", type)}
            colors={colors}
          />

          <InputField
            label="Amount"
            value={formData.amount}
            onChangeText={(text) => updateField("amount", text)}
            placeholder="0.00"
            keyboardType="numeric"
            colors={colors}
          />

          <CurrencySelector
            selected={formData.currency}
            onSelect={(currency) => updateField("currency", currency)}
            colors={colors}
          />

          <InputField
            label="Date"
            value={formData.date}
            onChangeText={(text) => updateField("date", text)}
            placeholder="YYYY-MM-DD"
            colors={colors}
          />

          <InputField
            label="Description"
            value={formData.description}
            onChangeText={(text) => updateField("description", text)}
            placeholder="e.g., Grocery shopping"
            colors={colors}
          />

          <CategorySelector
            selected={formData.category}
            onSelect={(category) => updateField("category", category)}
            colors={colors}
          />
        </View>

        {/* Error message */}
        {error && (
          <View
            style={{
              backgroundColor: "#EF444420",
              borderRadius: 12,
              padding: Spacing.three,
              marginBottom: Spacing.three,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                color: "#EF4444",
                textAlign: "center",
              }}
            >
              {error}
            </Text>
          </View>
        )}

        {/* Submit Button */}
        <Pressable
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={({ pressed }) => ({
            backgroundColor: colors.text,
            borderRadius: 16,
            paddingVertical: Spacing.three,
            alignItems: "center",
            opacity: pressed || isSubmitting ? 0.8 : 1,
          })}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: colors.background,
              }}
            >
              Create Transaction
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}
