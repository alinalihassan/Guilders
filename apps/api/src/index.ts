import { app } from "./app";
import { handleCallback } from "./callbacks";
import { handleScheduled } from "./cron";
import { handleMcp } from "./mcp/handler";
import type { WebhookEvent } from "./queues/types";
import { handleWebhookQueue } from "./queues/webhook-events";
export type { App } from "./app";
export type * from "./types";

export default {
  async fetch(request: Request, env: Env, executionCtx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/callback/")) {
      return handleCallback(request, env, url);
    }

    if (url.pathname === "/mcp") {
      return handleMcp(request, env, executionCtx);
    }

    return await app.fetch(request);
  },

  async scheduled(event: ScheduledEvent): Promise<void> {
    await handleScheduled(event);
  },

  async queue(batch: MessageBatch<WebhookEvent>, env: Env): Promise<void> {
    await handleWebhookQueue(batch, env);
  },
};
