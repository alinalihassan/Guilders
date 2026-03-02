import { apiKeyClient } from "@better-auth/api-key/client";
import { passkeyClient } from "@better-auth/passkey/client";
import { createAuthClient } from "better-auth/client";
import { inferAdditionalFields, twoFactorClient } from "better-auth/client/plugins";

import { env } from "./env";

export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_API_URL,
  plugins: [
    twoFactorClient(),
    // @ts-ignore TODO: Better Auth 1.5.0 issue, the plugin is there and works
    apiKeyClient(),
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
