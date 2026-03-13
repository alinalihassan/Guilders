import { eq } from "drizzle-orm";

import { institutionConnection } from "../db/schema/institution-connections";
import { providerConnection } from "../db/schema/provider-connections";
import { createDb } from "../lib/db";
import { GoCardlessClient } from "../providers/gocardless/client";
import { verifyState } from "../providers/state";
import type { GoCardlessWebhookEvent } from "../queues/types";
import { errorResponse, successResponse } from "./template";

export async function handleGoCardlessCallback(
  _request: Request,
  env: Env,
  url: URL,
): Promise<Response> {
  const stateParam = url.searchParams.get("state");

  if (!stateParam) {
    console.error("[GoCardless callback] Missing state");
    return errorResponse("Missing required parameters. Please try again.");
  }

  const secret = process.env.GUILDERS_SECRET;
  if (!secret) {
    console.error("[GoCardless callback] Missing GUILDERS_SECRET");
    return errorResponse("Server configuration error. Please try again later.");
  }

  const state = await verifyState(stateParam, secret);
  if (!state) {
    console.error("[GoCardless callback] State HMAC verification failed");
    return errorResponse("Invalid connection state. Please try again.");
  }

  const secretId = process.env.GOCARDLESS_SECRET_ID;
  const secretKey = process.env.GOCARDLESS_SECRET_KEY;
  if (!secretId || !secretKey) {
    return errorResponse("Provider configuration error.");
  }

  const client = new GoCardlessClient(secretId, secretKey);
  const requisitionsRes = await client.getRequisitions();
  const requisition = requisitionsRes.results?.find((r) => r.reference === stateParam);
  if (!requisition) {
    console.error("[GoCardless callback] No requisition found for state");
    return errorResponse("Connection not found. Please try again.");
  }
  if (requisition.status !== "LN") {
    console.error("[GoCardless callback] Requisition not linked", { status: requisition.status });
    return errorResponse("Bank authorization was not completed. Please try again.");
  }

  const db = createDb();

  try {
    const providerRecord = await db.query.provider.findFirst({
      where: { name: "GoCardless" },
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
        .set({ updated_at: new Date() })
        .where(eq(providerConnection.id, providerConn.id));
    } else {
      const [created] = await db
        .insert(providerConnection)
        .values({
          provider_id: providerRecord.id,
          user_id: state.userId,
        })
        .returning();
      providerConn = created;
    }

    if (!providerConn) return errorResponse("Failed to establish connection.");

    let existingInstConn = await db.query.institutionConnection.findFirst({
      where: {
        institution_id: state.institutionId,
        provider_connection_id: providerConn.id,
      },
    });

    if (existingInstConn) {
      await db
        .update(institutionConnection)
        .set({ connection_id: requisition.id, broken: false })
        .where(eq(institutionConnection.id, existingInstConn.id));
    } else {
      const [created] = await db
        .insert(institutionConnection)
        .values({
          institution_id: state.institutionId,
          provider_connection_id: providerConn.id,
          connection_id: requisition.id,
        })
        .returning();
      existingInstConn = created;
    }

    if (!existingInstConn) return errorResponse("Failed to create connection.");

    const event: GoCardlessWebhookEvent = {
      source: "gocardless",
      eventType: "CONNECTION_CREATED",
      payload: {
        userId: state.userId,
        institutionConnectionId: existingInstConn.id,
      },
    };

    await env.WEBHOOK_QUEUE.send(event);
    console.log("[GoCardless callback] enqueued CONNECTION_CREATED", {
      institutionConnectionId: existingInstConn.id,
    });

    return successResponse("Successfully connected your bank account!");
  } catch (callbackError) {
    console.error("[GoCardless callback] Unexpected error:", callbackError);
    return errorResponse("An unexpected error occurred. Please try again later.");
  }
}
