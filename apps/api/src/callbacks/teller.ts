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
    return handleTellerWebhook(request);
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

function parseTellerSignature(header: string) {
  const parts = header.split(",");
  let timestamp = "";
  const signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.split("=", 2);
    if (key === "t") timestamp = value ?? "";
    else if (key === "v1" && value) signatures.push(value);
  }

  return { timestamp, signatures };
}

async function verifyTellerSignature(
  body: string,
  header: string,
  secret: string,
): Promise<boolean> {
  const { timestamp, signatures } = parseTellerSignature(header);
  if (!timestamp || signatures.length === 0) return false;

  // Reject timestamps older than 3 minutes to prevent replay attacks
  const age = Date.now() / 1000 - Number(timestamp);
  if (age > 180) return false;

  const signedMessage = `${timestamp}.${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedMessage));
  const computed = Buffer.from(new Uint8Array(digest)).toString("hex");

  return signatures.some((sig) => sig === computed);
}

async function handleTellerWebhook(request: Request): Promise<Response> {
  const webhookSecret = process.env.TELLER_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return Response.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const signatureHeader = request.headers.get("teller-signature");
  if (!signatureHeader) {
    return Response.json({ error: "Missing signature" }, { status: 401 });
  }

  try {
    const body = await request.text();

    const valid = await verifyTellerSignature(body, signatureHeader, webhookSecret);
    if (!valid) {
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
