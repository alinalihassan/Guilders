import stringify from "fast-json-stable-stringify";

import type { SnapTradeEventType, SnapTradeWebhookEvent } from "../queues/types";

type SnapTradeWebhookBody = {
  webhookId: string;
  clientId: string;
  eventTimestamp: string;
  userId: string;
  eventType: string;
  webhookSecret: string;
  brokerageId?: string;
  brokerageAuthorizationId?: string;
  accountId?: string;
};

const HANDLED_EVENTS = new Set<SnapTradeEventType>([
  "CONNECTION_ADDED",
  "CONNECTION_DELETED",
  "CONNECTION_BROKEN",
  "CONNECTION_FIXED",
  "NEW_ACCOUNT_AVAILABLE",
  "ACCOUNT_TRANSACTIONS_INITIAL_UPDATE",
  "ACCOUNT_TRANSACTIONS_UPDATED",
  "ACCOUNT_HOLDINGS_UPDATED",
  "ACCOUNT_REMOVED",
]);

export async function handleSnapTradeCallback(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = request.headers.get("Signature");
  if (!signature) {
    return Response.json({ error: "Missing Signature header" }, { status: 401 });
  }

  let body: SnapTradeWebhookBody;
  try {
    body = (await request.json()) as SnapTradeWebhookBody;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.eventType || !body.userId) {
    return Response.json({ error: "Invalid webhook payload" }, { status: 400 });
  }

  const calculatedSignature = await createSnapTradeSignature(body, env.SNAPTRADE_CLIENT_SECRET);
  if (calculatedSignature !== signature) {
    return Response.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  const eventTimestamp = Date.parse(body.eventTimestamp);
  const maxAgeMs = 5 * 60 * 1000;
  if (Number.isNaN(eventTimestamp) || Date.now() - eventTimestamp > maxAgeMs) {
    return Response.json({ error: "Webhook payload is too old" }, { status: 401 });
  }

  if (!HANDLED_EVENTS.has(body.eventType as SnapTradeEventType)) {
    console.log("[SnapTrade callback] ignored event", {
      eventType: body.eventType,
      userId: body.userId,
      webhookId: body.webhookId,
    });
    return Response.json({ received: true, ignored: true });
  }

  console.log("[SnapTrade callback] received event", {
    eventType: body.eventType,
    userId: body.userId,
    webhookId: body.webhookId,
    brokerageId: body.brokerageId,
    brokerageAuthorizationId: body.brokerageAuthorizationId,
    accountId: body.accountId,
  });

  const event: SnapTradeWebhookEvent = {
    source: "snaptrade",
    eventType: body.eventType as SnapTradeEventType,
    payload: {
      userId: body.userId,
      brokerageId: body.brokerageId,
      brokerageAuthorizationId: body.brokerageAuthorizationId,
      accountId: body.accountId,
    },
  };

  await env.WEBHOOK_QUEUE.send(event);
  console.log("[SnapTrade callback] enqueued event", {
    eventType: event.eventType,
    userId: event.payload.userId,
    brokerageId: event.payload.brokerageId,
    brokerageAuthorizationId: event.payload.brokerageAuthorizationId,
    accountId: event.payload.accountId,
  });

  return Response.json({ received: true });
}

async function createSnapTradeSignature(
  payload: SnapTradeWebhookBody,
  secret: string,
): Promise<string> {
  const canonicalPayload = stringify(payload);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(canonicalPayload));
  const bytes = new Uint8Array(digest);
  const binary = String.fromCharCode(...bytes);
  return btoa(binary);
}
