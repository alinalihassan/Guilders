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
  return fetch(`${baseUrl}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
}

export const authApi = {
  async signInEmail(input: { email: string; password: string }) {
    const response = await authFetch("/api/auth/sign-in/email", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return parseResult(response);
  },

  async signUpEmail(input: { email: string; password: string; name: string }) {
    const response = await authFetch("/api/auth/sign-up/email", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return parseResult(response);
  },

  async signOut() {
    const response = await authFetch("/api/auth/sign-out", { method: "POST" });
    return parseResult(response);
  },

  async getSession() {
    const response = await authFetch("/api/auth/get-session", { method: "GET" });
    return parseResult<{ user?: { email?: string }; session?: { token?: string } }>(
      response,
    );
  },
};
