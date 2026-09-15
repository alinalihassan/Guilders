import type { App } from "@guilders/api/types";
import { hc } from "hono/client";
import { toast } from "sonner";

import { clientEnv } from "./env";

export const client = hc<App>(clientEnv.VITE_API_URL, {
  init: {
    credentials: "include",
  },
});

export const api = client.api;

export class ApiError extends Error {
  status: number;
  retryAfterSeconds?: number;

  constructor(message: string, status: number, retryAfterSeconds?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export async function rpcError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string; message?: string };
    return body.error ?? body.message ?? (res.statusText || "Unknown error");
  } catch {
    return res.statusText || "Unknown error";
  }
}

function parseRetryAfter(res: Response): number | undefined {
  const raw = res.headers.get("Retry-After");
  if (!raw) return undefined;
  const seconds = Number(raw);
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : undefined;
}

export async function rpcJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new ApiError(await rpcError(res), res.status, parseRetryAfter(res));
  }
  return res.json() as Promise<T>;
}

export function rpcErrorMessage(error: unknown): string {
  if (!error) return "Unknown error";
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}

export function isRateLimitError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status === 429 || error.message.includes("rate_limit");
  }
  return error instanceof Error && error.message.includes("rate_limit");
}

/** Shared toast copy for API mutation failures, including rate limits. */
export function toastApiError(title: string, error: unknown, fallback = "Please try again later") {
  if (isRateLimitError(error)) {
    const retryAfter =
      error instanceof ApiError && error.retryAfterSeconds != null
        ? error.retryAfterSeconds
        : undefined;
    toast.error(title, {
      description: retryAfter
        ? `Too many requests. Try again in ${retryAfter}s.`
        : "Too many requests. Try again shortly.",
    });
    return;
  }

  toast.error(title, { description: fallback });
}
