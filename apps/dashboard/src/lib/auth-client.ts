import { apiKey } from "@better-auth/api-key";
import { passkeyClient } from "@better-auth/passkey/client";
import { createAuthClient } from "better-auth/client";
import { inferAdditionalFields, twoFactorClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  plugins: [
    twoFactorClient(),
    apiKey(),
    passkeyClient(),
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
  fetchOptions: {
    credentials: "include",
  },
});
