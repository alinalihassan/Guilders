import { passkeyClient } from "@better-auth/passkey/client";
import { createAuthClient } from "better-auth/client";
import { apiKeyClient, twoFactorClient } from "better-auth/client/plugins";

const baseUrl = process.env.NEXT_PUBLIC_API_URL;

type AuthResult<T = unknown> = {
  data: T | null;
  error: { message: string } | null;
};

type BetterAuthResponse<T> = {
  data: T | null;
  error: { message?: string } | null;
};

const authClient = createAuthClient({
  baseURL: baseUrl,
  plugins: [twoFactorClient(), apiKeyClient(), passkeyClient()],
  fetchOptions: {
    credentials: "include",
  },
});

function toAuthResult<T>(response: BetterAuthResponse<T>): AuthResult<T> {
  return {
    data: response.data ?? null,
    error: response.error
      ? { message: response.error.message ?? "Authentication error" }
      : null,
  };
}

async function runClientRequest<T>(
  handler: () => Promise<BetterAuthResponse<T>>,
): Promise<AuthResult<T>> {
  try {
    if (!baseUrl) throw new Error("NEXT_PUBLIC_API_URL is not defined");
    const response = await handler();
    return toAuthResult(response);
  } catch (error) {
    return {
      data: null,
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Unable to complete authentication request.",
      },
    };
  }
}

export const authApi = {
  authClient,

  async signInEmail(input: { email: string; password: string }) {
    return runClientRequest(() => authClient.signIn.email(input));
  },

  async signUpEmail(input: { email: string; password: string; name: string }) {
    return runClientRequest(() => authClient.signUp.email(input));
  },

  async signOut() {
    return runClientRequest(() => authClient.signOut());
  },

  async getSession() {
    return runClientRequest<{ user?: { email?: string }; session?: { token?: string } }>(
      () => authClient.getSession(),
    );
  },

  async enableTwoFactor(input: { password: string; issuer?: string }) {
    return runClientRequest(() => authClient.twoFactor.enable(input));
  },

  async disableTwoFactor(input: { password: string }) {
    return runClientRequest(() => authClient.twoFactor.disable(input));
  },

  async getTotpUri(input: { password: string }) {
    return runClientRequest(() => authClient.twoFactor.getTotpUri(input));
  },

  async verifyTotp(input: { code: string; trustDevice?: boolean }) {
    return runClientRequest(() => authClient.twoFactor.verifyTotp(input));
  },

  async generateBackupCodes(input: { password: string }) {
    return runClientRequest(() => authClient.twoFactor.generateBackupCodes(input));
  },

  async listPasskeys() {
    return runClientRequest(() => authClient.passkey.listUserPasskeys({}));
  },

  async addPasskey(input?: {
    name?: string;
    authenticatorAttachment?: "platform" | "cross-platform";
  }) {
    return runClientRequest(() => authClient.passkey.addPasskey(input ?? {}));
  },

  async updatePasskey(input: { id: string; name: string }) {
    return runClientRequest(() => authClient.passkey.updatePasskey(input));
  },

  async deletePasskey(input: { id: string }) {
    return runClientRequest(() => authClient.passkey.deletePasskey(input));
  },

  async signInPasskey(input?: { autoFill?: boolean }) {
    return runClientRequest(() => authClient.signIn.passkey(input ?? {}));
  },

  async createApiKey(input: {
    name?: string;
    expiresIn?: number;
    prefix?: string;
    metadata?: unknown;
  }) {
    return runClientRequest(() => authClient.apiKey.create(input));
  },

  async listApiKeys() {
    return runClientRequest(() => authClient.apiKey.list({}));
  },

  async getApiKey(input: { id: string }) {
    return runClientRequest(() => authClient.apiKey.get({ query: input }));
  },

  async updateApiKey(input: {
    keyId: string;
    name?: string;
    enabled?: boolean;
    metadata?: unknown;
    remaining?: number;
    refillAmount?: number;
    refillInterval?: number;
  }) {
    return runClientRequest(() => authClient.apiKey.update(input));
  },

  async deleteApiKey(input: { keyId: string }) {
    return runClientRequest(() => authClient.apiKey.delete(input));
  },

};
