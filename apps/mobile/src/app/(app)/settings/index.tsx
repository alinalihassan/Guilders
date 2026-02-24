import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Switch, Text, useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors, Spacing } from "@/constants/theme";
import { authClient } from "@/lib/auth-client";

type ColorSet = (typeof Colors)["light"] | (typeof Colors)["dark"];

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionLabel({ title, colors }: { title: string; colors: ColorSet }) {
  return (
    <Text
      style={{
        fontSize: 13,
        fontWeight: "500",
        color: colors.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 0.4,
        paddingHorizontal: Spacing.one,
        marginBottom: Spacing.one,
      }}
    >
      {title}
    </Text>
  );
}

function SettingsGroup({ children, colors }: { children: React.ReactNode; colors: ColorSet }) {
  return (
    <View
      style={{
        backgroundColor: colors.backgroundElement,
        borderRadius: 16,
        borderCurve: "continuous",
        overflow: "hidden",
      }}
    >
      {children}
    </View>
  );
}

function RowDivider({ colors }: { colors: ColorSet }) {
  return (
    <View
      style={{
        height: 0.5,
        backgroundColor: colors.backgroundSelected,
        marginLeft: 56,
      }}
    />
  );
}

function SettingsRow({
  icon,
  iconBg,
  label,
  subtitle,
  value,
  onPress,
  toggle,
  toggleValue,
  onToggle,
  destructive,
  colors,
}: {
  icon: string;
  iconBg?: string;
  label: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (v: boolean) => void;
  destructive?: boolean;
  colors: ColorSet;
}) {
  const labelColor = destructive ? "#EF4444" : colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={toggle || !onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: Spacing.two + 2,
        paddingHorizontal: Spacing.three,
        gap: Spacing.two + 4,
        backgroundColor: pressed && onPress ? colors.backgroundSelected : "transparent",
      })}
    >
      {/* Icon */}
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          borderCurve: "continuous",
          backgroundColor: iconBg ?? colors.backgroundSelected,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Image
          source={`sf:${icon}`}
          style={{
            width: 16,
            height: 16,
            tintColor: iconBg ? "#fff" : colors.text,
          }}
        />
      </View>

      {/* Label + subtitle */}
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={{ fontSize: 16, color: labelColor }}>{label}</Text>
        {subtitle ? (
          <Text style={{ fontSize: 13, color: colors.textSecondary }}>{subtitle}</Text>
        ) : null}
      </View>

      {/* Right side */}
      {toggle ? (
        <Switch value={toggleValue} onValueChange={onToggle} trackColor={{ true: "#208AEF" }} />
      ) : value ? (
        <Text style={{ fontSize: 15, color: colors.textSecondary }}>{value}</Text>
      ) : onPress ? (
        <Image
          source="sf:chevron.right"
          style={{
            width: 12,
            height: 12,
            tintColor: colors.textSecondary,
            opacity: 0.5,
          }}
        />
      ) : null}
    </Pressable>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];
  const insets = useSafeAreaInsets();

  authClient.useSession();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await authClient.signOut();
          router.replace("/(auth)/sign-in");
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingBottom: insets.bottom + Spacing.six,
        paddingHorizontal: Spacing.three,
        gap: Spacing.four,
      }}
    >
      {/* Account section */}
      <View style={{ gap: Spacing.two }}>
        <SectionLabel title="Account" colors={colors} />
        <SettingsGroup colors={colors}>
          <SettingsRow
            icon="person.fill"
            iconBg="#208AEF"
            label="Profile"
            subtitle="Name, email, password"
            colors={colors}
            onPress={() => {}}
          />
          <RowDivider colors={colors} />
          <SettingsRow
            icon="lock.fill"
            iconBg="#6C47FF"
            label="Security"
            subtitle="2FA, biometrics"
            colors={colors}
            onPress={() => {}}
          />
        </SettingsGroup>
      </View>

      {/* Preferences section */}
      <View style={{ gap: Spacing.two }}>
        <SectionLabel title="Preferences" colors={colors} />
        <SettingsGroup colors={colors}>
          <SettingsRow
            icon="bell.fill"
            iconBg="#FF9500"
            label="Notifications"
            colors={colors}
            toggle
            toggleValue={notificationsEnabled}
            onToggle={setNotificationsEnabled}
          />
          <RowDivider colors={colors} />
          <SettingsRow
            icon="globe"
            iconBg="#34C759"
            label="Currency"
            value="EUR"
            colors={colors}
            onPress={() => {}}
          />
          <RowDivider colors={colors} />
          <SettingsRow
            icon="circle.lefthalf.filled"
            iconBg="#636366"
            label="Appearance"
            value="System"
            colors={colors}
            onPress={() => {}}
          />
        </SettingsGroup>
      </View>

      {/* Connections section */}
      <View style={{ gap: Spacing.two }}>
        <SectionLabel title="Connections" colors={colors} />
        <SettingsGroup colors={colors}>
          <SettingsRow
            icon="building.columns.fill"
            iconBg="#007AFF"
            label="Linked Accounts"
            subtitle="Banks, brokerages, crypto"
            colors={colors}
            onPress={() => {}}
          />
        </SettingsGroup>
      </View>

      {/* About section */}
      <View style={{ gap: Spacing.two }}>
        <SectionLabel title="About" colors={colors} />
        <SettingsGroup colors={colors}>
          <SettingsRow
            icon="info.circle.fill"
            iconBg="#636366"
            label="Version"
            value="1.0.0"
            colors={colors}
          />
          <RowDivider colors={colors} />
          <SettingsRow
            icon="doc.text.fill"
            iconBg="#636366"
            label="Privacy Policy"
            colors={colors}
            onPress={() => {}}
          />
          <RowDivider colors={colors} />
          <SettingsRow
            icon="questionmark.circle.fill"
            iconBg="#636366"
            label="Help & Support"
            colors={colors}
            onPress={() => {}}
          />
        </SettingsGroup>
      </View>

      {/* Sign out */}
      <SettingsGroup colors={colors}>
        <SettingsRow
          icon="rectangle.portrait.and.arrow.right"
          iconBg="#EF4444"
          label="Sign Out"
          destructive
          colors={colors}
          onPress={handleSignOut}
        />
      </SettingsGroup>
    </ScrollView>
  );
}
