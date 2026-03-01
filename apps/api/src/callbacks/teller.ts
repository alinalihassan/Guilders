import { eq } from "drizzle-orm";

import { institutionConnection } from "../db/schema/institution-connections";
import { providerConnection } from "../db/schema/provider-connections";
import { createDb } from "../lib/db";
import type { TellerConnectionState } from "../providers/teller/types";
import type { TellerWebhookEvent } from "../queues/types";
import { errorResponse, successResponse } from "./template";

export async function handleTellerCallback(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response> {
  if (request.method === "POST") {
    return handleTellerWebhook(request, env);
  }

  const accessToken = url.searchParams.get("access_token");
  const enrollmentId = url.searchParams.get("enrollment_id");
  const stateParam = url.searchParams.get("state");

  if (!accessToken || !enrollmentId || !stateParam) {
    console.error("[Teller callback] Missing required parameters");
    return errorResponse("Missing required parameters. Please try again.");
  }

  let state: TellerConnectionState;
  try {
    state = JSON.parse(stateParam);
  } catch {
    return errorResponse("Invalid connection state. Please try again.");
  }

  if (!state.userId || !state.institutionId) {
    return errorResponse("Invalid connection state. Please try again.");
  }

  const db = createDb();

  try {
    const providerRecord = await db.query.provider.findFirst({
      where: { name: "Teller" },
    });
    if (!providerRecord) return errorResponse("Provider configuration error.");

    let providerConn = await db.query.providerConnection.findFirst({
      where: {
        provider_id: providerRecord.id,
        user_id: state.userId,
      },
    });

    if (providerConn) {
      await db
        .update(providerConnection)
        .set({ secret: accessToken, updated_at: new Date() })
        .where(eq(providerConnection.id, providerConn.id));
    } else {
      const [created] = await db
        .insert(providerConnection)
        .values({
          provider_id: providerRecord.id,
          user_id: state.userId,
          secret: accessToken,
        })
        .returning();
      providerConn = created;
    }

    if (!providerConn) return errorResponse("Failed to establish connection.");

    const [instConn] = await db
      .insert(institutionConnection)
      .values({
        institution_id: state.institutionId,
        provider_connection_id: providerConn.id,
        connection_id: enrollmentId,
      })
      .returning();

    if (!instConn) return errorResponse("Failed to establish bank connection.");

    const event: TellerWebhookEvent = {
      source: "teller",
      eventType: "ENROLLMENT_CREATED",
      payload: {
        userId: state.userId,
        institutionConnectionId: instConn.id,
      },
    };

    await env.WEBHOOK_QUEUE.send(event);
    console.log("[Teller callback] enqueued ENROLLMENT_CREATED", {
      userId: state.userId,
      institutionConnectionId: instConn.id,
    });

    return successResponse("Successfully connected your bank account!");
  } catch (error) {
    console.error("[Teller callback] Unexpected error:", error);
    return errorResponse("An unexpected error occurred. Please try again later.");
  }
}

async function handleTellerWebhook(request: Request, env: Env): Promise<Response> {
  const webhookSecret = process.env.TELLER_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return Response.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const signature = request.headers.get("teller-signature");
  if (!signature) {
    return Response.json({ error: "Missing signature" }, { status: 401 });
  }

  try {
    const body = await request.text();

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(webhookSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
    const computed = Buffer.from(new Uint8Array(digest)).toString("hex");

    if (computed !== signature) {
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(body);
    console.log("[Teller webhook] Received event:", payload);

    return Response.json({ received: true });
  } catch (error) {
    console.error("[Teller webhook] Error:", error);
    return Response.json({ error: "Processing failed" }, { status: 500 });
  }
}
