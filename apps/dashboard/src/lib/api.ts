import { treaty } from "@elysiajs/eden";
import type { App } from "@guilders/api/src";

import { env } from "./env";

export const api = treaty<App>(env.NEXT_PUBLIC_API_URL, {
  fetch: {
    credentials: "include",
  },
}).api;

export function edenError(error: unknown): string {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  const val = (error as { value?: unknown }).value;
  if (val && typeof val === "object") {
    const msg =
      (val as { error?: string }).error ??
      (val as { message?: string }).message;
    if (msg) return msg;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}
