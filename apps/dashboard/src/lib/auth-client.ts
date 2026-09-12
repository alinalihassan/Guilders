import { apiKeyClient } from "@better-auth/api-key/client";
import { dashClient } from "@better-auth/infra/client";
import { passkeyClient } from "@better-auth/passkey/client";
import { stripeClient } from "@better-auth/stripe/client";
import { createAuthClient } from "better-auth/client";
import { inferAdditionalFields, twoFactorClient } from "better-auth/client/plugins";

import { clientEnv } from "./env";

export const authClient = createAuthClient({
  baseURL: clientEnv.VITE_API_URL,
  plugins: [
    dashClient(),
    twoFactorClient(),
    apiKeyClient(),
    passkeyClient(),
    stripeClient({ subscription: true }),
    inferAdditionalFields({
      user: {
        currency: {
          type: "string",
          required: false,
          defaultValue: "EUR",
        },
        timeFormat: {
          type: "string",
          required: false,
        },
      },
    }),
  ],
  fetchOptions: {
    credentials: "include",
  },
});
