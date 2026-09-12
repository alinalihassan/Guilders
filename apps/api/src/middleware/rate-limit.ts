import { env } from "cloudflare:workers";
import { createMiddleware } from "hono/factory";

export const RATE_LIMIT_PERIOD_SECONDS = 60;

async function hashApiKey(apiKey: string): Promise<string> {
  const data = new TextEncoder().encode(apiKey);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex.slice(0, 16);
}

export const apiKeyRateLimit = createMiddleware(async (c, next) => {
  const rateLimit = env.RATE_LIMIT;
  if (rateLimit == null) {
    await next();
    return;
  }

  const apiKey = c.req.header("x-api-key");
  if (!apiKey) {
    await next();
    return;
  }

  const key = "apikey:" + (await hashApiKey(apiKey));
  const { success } = await rateLimit.limit({ key });
  if (!success) {
    c.header("Retry-After", String(RATE_LIMIT_PERIOD_SECONDS));
    return c.json(
      {
        error: "rate_limit_exceeded",
        message: "Too many requests",
      },
      429,
    );
  }

  await next();
});
