export function generateSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `whsec_${hex}`;
}

export function maskUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}/***`;
  } catch {
    return "***";
  }
}

export function validateWebhookUrl(url: string): { valid: boolean; error?: string } {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") {
      const isDev = process.env.NODE_ENV === "development";
      if (!isDev || u.hostname !== "localhost") {
        return { valid: false, error: "URL must use HTTPS" };
      }
    }
    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid URL" };
  }
}
