import { eq } from "drizzle-orm";

import { institutionConnection } from "../db/schema/institution-connections";
import { providerConnection } from "../db/schema/provider-connections";
import { createDb } from "../lib/db";
import { EnableBankingClient } from "../providers/enablebanking/client";
import { verifyState } from "../providers/state";
import type { EnableBankingWebhookEvent } from "../queues/types";
import { errorResponse, successResponse } from "./template";

export async function handleEnableBankingCallback(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response> {
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    console.error(
      "[EnableBanking callback] Authorization error:",
      error,
      url.searchParams.get("error_description"),
    );
    return errorResponse("Bank authorization was cancelled or failed. Please try again.");
  }

  if (!code || !stateParam) {
    console.error("[EnableBanking callback] Missing code or state");
    return errorResponse("Missing required parameters. Please try again.");
  }

  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    console.error("[EnableBanking callback] Missing BETTER_AUTH_SECRET");
    return errorResponse("Server configuration error. Please try again later.");
  }

  const state = await verifyState(stateParam, secret);
  if (!state) {
    console.error("[EnableBanking callback] State HMAC verification failed");
    return errorResponse("Invalid connection state. Please try again.");
  }

  const db = createDb();

  try {
    const providerRecord = await db.query.provider.findFirst({
      where: { name: "EnableBanking" },
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

    const clientId = process.env.ENABLEBANKING_CLIENT_ID;
    const privateKey = process.env.ENABLEBANKING_CLIENT_PRIVATE_KEY;
    if (!clientId || !privateKey) return errorResponse("Provider configuration error.");

    const enableBankingClient = new EnableBankingClient(clientId, privateKey);
    const session = await enableBankingClient.authorizeSession(code);

    const [instConn] = await db
      .insert(institutionConnection)
      .values({
        institution_id: state.institutionId,
        provider_connection_id: providerConn.id,
        connection_id: session.session_id,
      })
      .onConflictDoNothing({ target: institutionConnection.connection_id })
      .returning();

    if (!instConn) {
      console.log("[EnableBanking callback] duplicate callback, connection already exists", {
        connectionId: session.session_id,
      });
      return successResponse("Successfully connected your bank account!");
    }

    const event: EnableBankingWebhookEvent = {
      source: "enablebanking",
      eventType: "CONNECTION_CREATED",
      payload: {
        userId: state.userId,
        institutionConnectionId: instConn.id,
      },
    };

    await env.WEBHOOK_QUEUE.send(event);
    console.log("[EnableBanking callback] enqueued CONNECTION_CREATED", {
      userId: state.userId,
      institutionConnectionId: instConn.id,
    });

    return successResponse("Successfully connected your bank account!");
  } catch (error) {
    console.error("[EnableBanking callback] Unexpected error:", error);
    return errorResponse("An unexpected error occurred. Please try again later.");
  }
}
