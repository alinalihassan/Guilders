import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';
import { Platform, useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme ?? 'light'];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        {Platform.select({
          ios: <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} />,
          android: <NativeTabs.Trigger.Icon md="home" />,
        })}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        {Platform.select({
          ios: <NativeTabs.Trigger.Icon sf="gearshape" />,
          android: <NativeTabs.Trigger.Icon md="settings" />,
        })}
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
