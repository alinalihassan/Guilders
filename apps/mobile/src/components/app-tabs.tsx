import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Platform, useColorScheme } from "react-native";

import { Colors } from "@/constants/theme";

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "unspecified" ? "light" : (scheme ?? "light")];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}
      minimizeBehavior="onScrollDown"
    >
      <NativeTabs.Trigger name="accounts">
        <NativeTabs.Trigger.Label>Accounts</NativeTabs.Trigger.Label>
        {Platform.select({
          ios: (
            <NativeTabs.Trigger.Icon sf={{ default: "creditcard", selected: "creditcard.fill" }} />
          ),
          android: <NativeTabs.Trigger.Icon md="account_balance_wallet" />,
        })}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="transactions">
        <NativeTabs.Trigger.Label>Transactions</NativeTabs.Trigger.Label>
        {Platform.select({
          ios: <NativeTabs.Trigger.Icon sf="list.bullet" />,
          android: <NativeTabs.Trigger.Icon md="format_list_bulleted" />,
        })}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="search" role="search">
        <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
        {Platform.select({
          ios: <NativeTabs.Trigger.Icon sf="magnifyingglass" />,
          android: <NativeTabs.Trigger.Icon md="search" />,
        })}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="chat">
        <NativeTabs.Trigger.Label>AI Chat</NativeTabs.Trigger.Label>
        {Platform.select({
          ios: <NativeTabs.Trigger.Icon sf="bubble.left.and.bubble.right" />,
          android: <NativeTabs.Trigger.Icon md="chat" />,
        })}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        {Platform.select({
          ios: <NativeTabs.Trigger.Icon sf="gearshape" />,
          android: <NativeTabs.Trigger.Icon md="settings" />,
        })}
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
