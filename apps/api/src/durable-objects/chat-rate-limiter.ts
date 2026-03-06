import { DurableObject } from "cloudflare:workers";

const STORAGE_KEY = "timestamps";

function parseBody<T>(request: Request): Promise<T> {
  return request.json() as Promise<T>;
}

/**
 * Sliding-window rate limiter for AI Advisor chat messages.
 * One DO instance per user (idFromName("chat:" + userId)).
 * Persists timestamps in DO storage so limits survive restarts.
 */
export class ChatRateLimiter extends DurableObject {
  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/consume" && request.method === "POST") {
      return this.consume(request);
    }
    if (url.pathname === "/status" && request.method === "GET") {
      return this.status(request);
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  private async getTimestampsInWindow(periodSeconds: number): Promise<number[]> {
    const raw = (await this.ctx.storage.get<number[]>(STORAGE_KEY)) ?? [];
    const nowSec = Math.floor(Date.now() / 1000);
    const cutoff = nowSec - periodSeconds;
    return raw.filter((t) => t >= cutoff);
  }

  private computeResetAt(timestamps: number[], periodSeconds: number): number | null {
    if (timestamps.length === 0) return null;
    const oldest = Math.min(...timestamps);
    return oldest + periodSeconds;
  }

  private async consume(request: Request): Promise<Response> {
    let limit: number;
    let periodSeconds: number;
    try {
      const body = await parseBody<{ limit: number; periodSeconds: number }>(request);
      limit = Number(body.limit);
      periodSeconds = Number(body.periodSeconds);
      if (
        !Number.isInteger(limit) ||
        limit < 1 ||
        !Number.isInteger(periodSeconds) ||
        periodSeconds < 1
      ) {
        return new Response(JSON.stringify({ error: "Invalid limit or periodSeconds" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const timestamps = await this.getTimestampsInWindow(periodSeconds);
    const used = timestamps.length;
    const resetAt = this.computeResetAt(timestamps, periodSeconds);

    if (used >= limit) {
      return new Response(
        JSON.stringify({
          allowed: false,
          remaining: 0,
          used,
          limit,
          resetAt,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const updated = [...timestamps, nowSec];
    await this.ctx.storage.put(STORAGE_KEY, updated);

    const remaining = limit - updated.length;
    const newResetAt = this.computeResetAt(updated, periodSeconds);

    return new Response(
      JSON.stringify({
        allowed: true,
        remaining,
        used: updated.length,
        limit,
        resetAt: newResetAt,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  private async status(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit"));
    const periodSeconds = Number(url.searchParams.get("periodSeconds"));
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      !Number.isInteger(periodSeconds) ||
      periodSeconds < 1
    ) {
      return new Response(JSON.stringify({ error: "Invalid limit or periodSeconds" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const timestamps = await this.getTimestampsInWindow(periodSeconds);
    const used = timestamps.length;
    const remaining = Math.max(0, limit - used);
    const resetAt = this.computeResetAt(timestamps, periodSeconds);

    return new Response(
      JSON.stringify({
        used,
        remaining,
        limit,
        resetAt,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
