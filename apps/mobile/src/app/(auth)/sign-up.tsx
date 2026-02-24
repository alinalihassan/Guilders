import { Link, router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";

import { Colors, Fonts, Spacing } from "@/constants/theme";
import { authClient } from "@/lib/auth-client";

export default function SignUpScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!name || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { error: authError } = await authClient.signUp.email({ name, email, password });
      if (authError) {
        setError(authError.message ?? "Sign up failed.");
      } else {
        router.replace("/(app)");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    backgroundColor: colors.backgroundElement,
    borderRadius: 12,
    borderCurve: "continuous" as const,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 4,
    fontSize: 16,
    color: colors.text,
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingHorizontal: Spacing.four,
          gap: Spacing.three,
        }}
      >
        {/* Header */}
        <View style={{ gap: Spacing.one, marginBottom: Spacing.two }}>
          <Text
            style={{
              fontSize: 32,
              fontWeight: "700",
              color: colors.text,
              fontFamily: Fonts?.rounded,
            }}
          >
            Create account
          </Text>
          <Text style={{ fontSize: 16, color: colors.textSecondary }}>
            Start tracking your finances with Guilders
          </Text>
        </View>

        {/* Form */}
        <View style={{ gap: Spacing.two }}>
          <View style={{ gap: Spacing.one }}>
            <Text style={{ fontSize: 14, fontWeight: "500", color: colors.textSecondary }}>
              Full Name
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="John Doe"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="words"
              textContentType="name"
              style={inputStyle}
            />
          </View>

          <View style={{ gap: Spacing.one }}>
            <Text style={{ fontSize: 14, fontWeight: "500", color: colors.textSecondary }}>
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              style={inputStyle}
            />
          </View>

          <View style={{ gap: Spacing.one }}>
            <Text style={{ fontSize: 14, fontWeight: "500", color: colors.textSecondary }}>
              Password
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Min. 8 characters"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              textContentType="newPassword"
              style={inputStyle}
            />
          </View>

          {error ? (
            <Text style={{ fontSize: 14, color: "#EF4444", textAlign: "center" }}>{error}</Text>
          ) : null}

          <Pressable
            onPress={handleSignUp}
            disabled={loading}
            style={({ pressed }) => ({
              backgroundColor: "#208AEF",
              borderRadius: 12,
              borderCurve: "continuous",
              paddingVertical: Spacing.two + 4,
              alignItems: "center",
              marginTop: Spacing.one,
              opacity: pressed || loading ? 0.7 : 1,
            })}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>Create Account</Text>
            )}
          </Pressable>
        </View>

        {/* Footer */}
        <View style={{ flexDirection: "row", justifyContent: "center", gap: Spacing.one }}>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
            Already have an account?
          </Text>
          <Link href="/(auth)/sign-in" asChild>
            <Pressable>
              <Text style={{ color: "#208AEF", fontSize: 14, fontWeight: "500" }}>Sign In</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
