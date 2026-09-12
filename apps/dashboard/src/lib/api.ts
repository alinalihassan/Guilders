import type { App } from "@guilders/api/src";
import { hc } from "hono/client";

import { clientEnv } from "./env";

export const client = hc<App>(clientEnv.VITE_API_URL, {
  init: {
    credentials: "include",
  },
});

export const api = client.api;

export async function rpcError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string; message?: string };
    return body.error ?? body.message ?? (res.statusText || "Unknown error");
  } catch {
    return res.statusText || "Unknown error";
  }
}

export async function rpcJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new Error(await rpcError(res));
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
