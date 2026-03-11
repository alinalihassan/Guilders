import { app } from "./app";
import { handleCallback } from "./callbacks";
import { handleScheduled } from "./cron";
import { ChatRateLimiter } from "./durable-objects/chat-rate-limiter";
import { handleMcp } from "./mcp/handler";
import {
  handleTransactionEnrichmentQueue,
  TRANSACTION_ENRICHMENT_QUEUE_NAME,
} from "./queues/transaction-enrichment";
import type { WebhookEvent } from "./queues/types";
import { handleWebhookQueue } from "./queues/webhook-events";

const WEBHOOK_QUEUE_NAME = "guilders-webhook-events";

export type { App } from "./app";
export type * from "./types";

export { ChatRateLimiter };

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

  async queue(batch: MessageBatch<unknown>, env: Env): Promise<void> {
    if (batch.queue === TRANSACTION_ENRICHMENT_QUEUE_NAME) {
      await handleTransactionEnrichmentQueue(
        batch as MessageBatch<import("./queues/types").TransactionEnrichmentPayload>,
        env,
      );
      return;
    }
    if (batch.queue === WEBHOOK_QUEUE_NAME) {
      await handleWebhookQueue(batch as MessageBatch<WebhookEvent>, env);
      return;
    }
    console.error("[Queue] unknown queue", { queue: batch.queue });
  },
};
