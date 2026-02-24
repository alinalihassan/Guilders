import { Image } from "expo-image";
import { router, Stack } from "expo-router";
import { Pressable, useColorScheme } from "react-native";

import { Colors } from "@/constants/theme";

export default function TransactionsLayout() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Transactions",
          headerLargeTitle: true,
          headerTransparent: true,
          headerRight: () => (
            <Pressable
              onPress={() => router.push("/transaction/create")}
              style={() => ({
                width: 32,
                height: 32,
                justifyContent: "center",
                alignItems: "center",
              })}
            >
              <Image source="sf:plus" style={{ width: 22, height: 22, tintColor: colors.text }} />
            </Pressable>
          ),
        }}
      />
    </Stack>
  );
}
