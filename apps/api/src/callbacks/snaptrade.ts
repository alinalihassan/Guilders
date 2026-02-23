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

export async function handleSnapTradeCallback(
  request: Request,
  env: Env,
): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body: SnapTradeWebhookBody;
  try {
    body = await request.json() as SnapTradeWebhookBody;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.eventType || !body.userId) {
    return Response.json({ error: "Invalid webhook payload" }, { status: 400 });
  }

  const webhookSecret = process.env.SNAPTRADE_WEBHOOK_SECRET;
  if (!webhookSecret || body.webhookSecret !== webhookSecret) {
    return Response.json({ error: "Invalid webhook secret" }, { status: 401 });
  }

  if (!HANDLED_EVENTS.has(body.eventType as SnapTradeEventType)) {
    return Response.json({ received: true, ignored: true });
  }

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

  return Response.json({ received: true });
}
