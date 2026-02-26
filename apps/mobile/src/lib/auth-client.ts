import { expoClient } from "@better-auth/expo/client";
import { stripeClient } from "@better-auth/stripe/client";
import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import * as SecureStore from "expo-secure-store";

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000",
  plugins: [
    expoClient({
      scheme: "guilders-mobile",
      storagePrefix: "guilders",
      storage: SecureStore,
    }),
    stripeClient({
      subscription: true,
    }),
    inferAdditionalFields({
      user: {
        currency: {
          type: "string",
          required: false,
          defaultValue: "EUR",
        },
      },
    }),
  ],
});

export type Session = typeof authClient.$Infer.Session;
