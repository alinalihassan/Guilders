import { apiKeyClient } from "@better-auth/api-key/client";
import { passkeyClient } from "@better-auth/passkey/client";
import { stripeClient } from "@better-auth/stripe/client";
import type { BetterAuthClientOptions } from "better-auth/client";
import { createAuthClient } from "better-auth/client";
import { inferAdditionalFields, twoFactorClient } from "better-auth/client/plugins";

import { clientEnv } from "./env";

const plugins = [
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
];

export const authClient = createAuthClient({
  baseURL: clientEnv.VITE_API_URL,
  plugins,
  fetchOptions: {
    credentials: "include",
  },
  // TODO: Better Auth 1.5.0 issue, the plugins are there and they work, but the types are not inferred correctly
} as BetterAuthClientOptions & { plugins: typeof plugins });
