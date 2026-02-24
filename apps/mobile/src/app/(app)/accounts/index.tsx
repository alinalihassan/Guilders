import { Image } from "expo-image";
import { router } from "expo-router";
import { useCallback, useState } from "react";
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

import { Colors, Fonts, Spacing } from "@/constants/theme";
import { type Account, useAccounts } from "@/hooks/use-dashboard";

type ColorSet = (typeof Colors)["light"] | (typeof Colors)["dark"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(value: number, currency = "EUR"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getAccountIcon(subtype: string): string {
  const map: Record<string, string> = {
    depository: "🏦",
    brokerage: "📈",
    crypto: "₿",
    property: "🏠",
    vehicle: "🚗",
    creditcard: "💳",
    loan: "📄",
    stock: "📊",
  };
  return map[subtype.toLowerCase()] ?? "💰";
}

// ─── Components ──────────────────────────────────────────────────────────────

function TimeSelector({
  selected,
  onSelect,
  colors,
}: {
  selected: string;
  onSelect: (period: string) => void;
  colors: ColorSet;
}) {
  const periods = ["1D", "1W", "1M", "6M", "1Y"];

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "center",
        gap: Spacing.four,
        marginTop: Spacing.three,
      }}
    >
      {periods.map((period) => (
        <Pressable
          key={period}
          onPress={() => onSelect(period)}
          style={{
            paddingVertical: Spacing.one,
            paddingHorizontal: Spacing.two,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: selected === period ? "600" : "400",
              color: selected === period ? colors.text : colors.textSecondary,
            }}
          >
            {period}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function AccountCard({ account, colors }: { account: Account; colors: ColorSet }) {
  const value = parseFloat(account.value);

  return (
    <Pressable
      style={{
        flex: 1,
        backgroundColor: colors.backgroundElement,
        borderRadius: 16,
        padding: Spacing.three,
        minHeight: 100,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          backgroundColor: colors.backgroundSelected,
          justifyContent: "center",
          alignItems: "center",
          marginBottom: Spacing.two,
        }}
      >
        <Text style={{ fontSize: 20 }}>{getAccountIcon(account.subtype)}</Text>
      </View>
      <Text
        style={{
          fontSize: 13,
          color: colors.textSecondary,
          marginBottom: Spacing.one,
        }}
      >
        {account.name}
      </Text>
      <Text
        style={{
          fontSize: 17,
          fontWeight: "600",
          color: colors.text,
          fontVariant: ["tabular-nums"],
        }}
      >
        {formatCurrency(value, account.currency)}
      </Text>
    </Pressable>
  );
}

function AddAccountCard({ colors }: { colors: ColorSet }) {
  return (
    <Pressable
      onPress={() => router.push("/account/create")}
      style={({ pressed }) => ({
        flex: 1,
        backgroundColor: colors.backgroundElement,
        borderRadius: 16,
        padding: Spacing.three,
        minHeight: 100,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: colors.backgroundSelected,
        borderStyle: "dashed",
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          backgroundColor: colors.backgroundSelected,
          justifyContent: "center",
          alignItems: "center",
          marginBottom: Spacing.two,
        }}
      >
        <Text style={{ fontSize: 24, color: colors.textSecondary }}>+</Text>
      </View>
      <Text
        style={{
          fontSize: 13,
          color: colors.textSecondary,
          fontWeight: "500",
        }}
      >
        Add Account
      </Text>
    </Pressable>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];
  const insets = useSafeAreaInsets();

  const {
    data: accounts,
    totalValue,
    loading: accountsLoading,
    refetch: refetchAccounts,
  } = useAccounts();

  const [selectedPeriod, setSelectedPeriod] = useState("1M");

  const accountsList = accounts ?? [];

  const onRefresh = useCallback(async () => {
    await refetchAccounts();
  }, [refetchAccounts]);

  const isLoading = accountsLoading;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={onRefresh}
          tintColor={colors.textSecondary}
        />
      }
      contentContainerStyle={{
        paddingBottom: insets.bottom + Spacing.six,
      }}
    >
      {/* Balance Section */}
      <View style={{ paddingHorizontal: Spacing.four, marginTop: Spacing.four }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.two }}>
          <Text style={{ fontSize: 15, color: colors.textSecondary }}>Total Balance</Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#22C55E20",
              paddingHorizontal: Spacing.two,
              paddingVertical: 2,
              borderRadius: 12,
            }}
          >
            <Image
              source="sf:arrow.up.forward"
              style={{ width: 12, height: 12, tintColor: "#22C55E" }}
            />
            <Text style={{ fontSize: 13, color: "#22C55E", fontWeight: "600" }}>12.5%</Text>
          </View>
        </View>

        {/* Large Amount */}
        {accountsLoading ? (
          <ActivityIndicator
            size="large"
            color={colors.textSecondary}
            style={{ marginTop: Spacing.two }}
          />
        ) : (
          <Text
            style={{
              fontSize: 48,
              fontWeight: "700",
              color: colors.text,
              fontFamily: Fonts?.rounded,
              marginTop: Spacing.one,
              fontVariant: ["tabular-nums"],
            }}
          >
            {formatCurrency(totalValue)}
          </Text>
        )}

        {/* Simple sparkline placeholder */}
        <View
          style={{
            height: 60,
            marginTop: Spacing.three,
            flexDirection: "row",
            alignItems: "flex-end",
            gap: 2,
            opacity: 0.3,
          }}
        >
          {[40, 35, 45, 30, 50, 40, 55, 45, 60, 50, 65, 55, 70, 60, 75, 65, 80, 70, 85, 75].map(
            (h, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: `${h}%`,
                  backgroundColor: colors.text,
                  borderRadius: 1,
                  minHeight: 4,
                }}
              />
            ),
          )}
        </View>

        {/* Time Selector */}
        <TimeSelector selected={selectedPeriod} onSelect={setSelectedPeriod} colors={colors} />
      </View>

      {/* Accounts Grid - 2 columns */}
      <View style={{ paddingHorizontal: Spacing.four, marginTop: Spacing.five }}>
        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: colors.text,
            marginBottom: Spacing.three,
            fontFamily: Fonts?.rounded,
          }}
        >
          Accounts
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: Spacing.two }}>
          {accountsLoading ? (
            <ActivityIndicator
              size="large"
              color={colors.textSecondary}
              style={{ flex: 1, marginTop: Spacing.four }}
            />
          ) : (
            <>
              {accountsList.map((account) => (
                <View key={account.id} style={{ width: "48%" }}>
                  <AccountCard account={account} colors={colors} />
                </View>
              ))}
              <View style={{ width: "48%" }}>
                <AddAccountCard colors={colors} />
              </View>
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
