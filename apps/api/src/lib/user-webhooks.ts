import type { Database } from "./db";

export type UserWebhookEventType =
  | "account.created"
  | "account.updated"
  | "account.deleted"
  | "transaction.created"
  | "transaction.updated"
  | "transaction.deleted"
  | "category.created"
  | "category.updated"
  | "category.deleted";

async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Deliver webhook events to all enabled webhooks for the user.
 * Intended to be used with waitUntil() so the worker stays alive until delivery is sent.
 * Failures are logged but do not throw.
 */
export async function deliverUserWebhookEvents(
  db: Database,
  userId: string,
  eventType: UserWebhookEventType,
  data: Record<string, unknown>,
): Promise<void> {
  const endpoints = await db.query.webhook.findMany({
    where: { user_id: userId, enabled: true },
    columns: { id: true, url: true, secret: true },
  });

  if (endpoints.length === 0) return;

  const timestamp = new Date().toISOString();

  await Promise.all(
    endpoints.map(async (endpoint) => {
      const deliveryId = crypto.randomUUID();
      const body = JSON.stringify({
        event: eventType,
        deliveryId,
        timestamp,
        data,
      });

      try {
        const signature = await hmacSha256Hex(endpoint.secret, body);

        const response = await fetch(endpoint.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Signature": `sha256=${signature}`,
            "X-Webhook-Event": eventType,
            "X-Webhook-Delivery-Id": deliveryId,
            "X-Webhook-Timestamp": timestamp,
          },
          body,
        });

        if (!response.ok) {
          console.warn("[Webhook] delivery failed", {
            webhookId: endpoint.id,
            eventType,
            deliveryId,
            status: response.status,
            statusText: response.statusText,
          });
        }
      } catch (error) {
        console.warn("[Webhook] delivery error", {
          webhookId: endpoint.id,
          eventType,
          deliveryId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }),
  );
}
