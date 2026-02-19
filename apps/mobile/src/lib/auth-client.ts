import { expoClient } from '@better-auth/expo/client';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000',
  plugins: [
    expoClient({
      scheme: 'guilders-mobile',
      storagePrefix: 'guilders',
      storage: SecureStore,
    }),
  ],
});

export type Session = typeof authClient.$Infer.Session;
