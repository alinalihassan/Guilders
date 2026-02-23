const baseUrl = process.env.NEXT_PUBLIC_API_URL;

type AuthResult<T = unknown> = {
  data: T | null;
  error: { message: string } | null;
};

async function parseResult<T>(response: Response): Promise<AuthResult<T>> {
  const payload = (await response.json().catch(() => null)) as
    | { error?: { message?: string } | string; message?: string }
    | T
    | null;

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload !== null
        ? typeof (payload as { error?: unknown }).error === "string"
          ? ((payload as { error: string }).error ?? "Authentication error")
          : ((payload as { error?: { message?: string } }).error?.message ??
            (payload as { message?: string }).message ??
            "Authentication error")
        : "Authentication error";

    return { data: null, error: { message } };
  }

  return { data: (payload as T) ?? null, error: null };
}

async function authFetch(path: string, options?: RequestInit): Promise<Response> {
  if (!baseUrl) throw new Error("NEXT_PUBLIC_API_URL is not defined");
  try {
    return await fetch(`${baseUrl}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers ?? {}),
      },
    });
  } catch {
    throw new Error(
      "Unable to reach the API. Make sure the API server is running and NEXT_PUBLIC_API_URL is correct.",
    );
  }
}

async function runAuthRequest<T>(path: string, options?: RequestInit): Promise<AuthResult<T>> {
  try {
    const response = await authFetch(path, options);
    return parseResult<T>(response);
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
  async signInEmail(input: { email: string; password: string }) {
    return runAuthRequest("/api/auth/sign-in/email", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async signUpEmail(input: { email: string; password: string; name: string }) {
    return runAuthRequest("/api/auth/sign-up/email", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async signOut() {
    return runAuthRequest("/api/auth/sign-out", { method: "POST" });
  },

  async getSession() {
    return runAuthRequest<{ user?: { email?: string }; session?: { token?: string } }>(
      "/api/auth/get-session",
      { method: "GET" },
    );
  },
};
