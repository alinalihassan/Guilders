import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { authClient } from '@/lib/auth-client';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useColorScheme } from 'react-native';

export default function SignInScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { error: authError } = await authClient.signIn.email({ email, password });
      if (authError) {
        setError(authError.message ?? 'Sign in failed.');
      } else {
        router.replace('/(app)');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: Spacing.four,
          gap: Spacing.three,
        }}>
        {/* Header */}
        <View style={{ gap: Spacing.one, marginBottom: Spacing.two }}>
          <Text
            style={{
              fontSize: 32,
              fontWeight: '700',
              color: colors.text,
              fontFamily: Fonts?.rounded,
            }}>
            Welcome back
          </Text>
          <Text style={{ fontSize: 16, color: colors.textSecondary }}>
            Sign in to your Guilders account
          </Text>
        </View>

        {/* Form */}
        <View style={{ gap: Spacing.two }}>
          <View style={{ gap: Spacing.one }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textSecondary }}>
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
              style={{
                backgroundColor: colors.backgroundElement,
                borderRadius: 12,
                borderCurve: 'continuous',
                paddingHorizontal: Spacing.three,
                paddingVertical: Spacing.two + 4,
                fontSize: 16,
                color: colors.text,
              }}
            />
          </View>

          <View style={{ gap: Spacing.one }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textSecondary }}>
              Password
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              textContentType="password"
              style={{
                backgroundColor: colors.backgroundElement,
                borderRadius: 12,
                borderCurve: 'continuous',
                paddingHorizontal: Spacing.three,
                paddingVertical: Spacing.two + 4,
                fontSize: 16,
                color: colors.text,
              }}
            />
          </View>

          {error ? (
            <Text style={{ fontSize: 14, color: '#EF4444', textAlign: 'center' }}>{error}</Text>
          ) : null}

          <Pressable
            onPress={handleSignIn}
            disabled={loading}
            style={({ pressed }) => ({
              backgroundColor: '#208AEF',
              borderRadius: 12,
              borderCurve: 'continuous',
              paddingVertical: Spacing.two + 4,
              alignItems: 'center',
              marginTop: Spacing.one,
              opacity: pressed || loading ? 0.7 : 1,
            })}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Sign In</Text>
            )}
          </Pressable>
        </View>

        {/* Footer */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: Spacing.one }}>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
            Don&apos;t have an account?
          </Text>
          <Link href="/(auth)/sign-up" asChild>
            <Pressable>
              <Text style={{ color: '#208AEF', fontSize: 14, fontWeight: '500' }}>Sign Up</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
