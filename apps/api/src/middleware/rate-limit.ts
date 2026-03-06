import { env } from "cloudflare:workers";
import { Elysia } from "elysia";

export const RATE_LIMIT_PERIOD_SECONDS = 60;

async function hashApiKey(apiKey: string): Promise<string> {
  const data = new TextEncoder().encode(apiKey);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex.slice(0, 16);
}

function rateLimitExceededResponse(): Response {
  return new Response(
    JSON.stringify({
      error: "rate_limit_exceeded",
      message: "Too many requests",
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(RATE_LIMIT_PERIOD_SECONDS),
      },
    },
  );
}

export const rateLimitPlugin = new Elysia({ name: "rate-limit" }).onBeforeHandle(
  async ({ request }) => {
    const rateLimit = env.RATE_LIMIT;
    if (rateLimit == null) return;

    const apiKey = request.headers.get("x-api-key");
    if (!apiKey) return;

    const key = "apikey:" + (await hashApiKey(apiKey));
    const { success } = await rateLimit.limit({ key });
    if (!success) {
      return rateLimitExceededResponse();
    }
  },
);
