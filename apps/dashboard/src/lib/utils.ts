import type { User } from "@guilders/api/types";
import { redirect } from "@tanstack/react-router";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Redirects to a specified path with an encoded message as a query parameter.
 * Use in server context (e.g. server functions); throws so does not return.
 */
export function encodedRedirect(type: "error" | "success", path: string, message: string) {
  throw redirect({
    to: path,
    search: { [type]: message },
  });
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(
  bytes: number,
  opts: {
    decimals?: number;
    sizeType?: "accurate" | "normal";
  } = {},
) {
  const { decimals = 0, sizeType = "normal" } = opts;

  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const accurateSizes = ["Bytes", "KiB", "MiB", "GiB", "TiB"];
  if (bytes === 0) return "0 Byte";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(decimals)} ${
    sizeType === "accurate" ? (accurateSizes[i] ?? "Bytes") : (sizes[i] ?? "Bytes")
  }`;
}

export function isPro(user: User | undefined | null, billingEnabled?: boolean) {
  if (billingEnabled === false) return true;
  return user?.subscription?.status === "active" || user?.subscription?.status === "trialing";
}

export function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  // Defer revocation so the browser can start the download before the URL is revoked
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
