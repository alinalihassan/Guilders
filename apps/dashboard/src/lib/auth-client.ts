import { passkeyClient } from "@better-auth/passkey/client";
import { createAuthClient } from "better-auth/client";
import { apiKeyClient, twoFactorClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  plugins: [twoFactorClient(), apiKeyClient(), passkeyClient()],
  fetchOptions: {
    credentials: "include",
  },
});
