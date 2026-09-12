import { and, eq } from "drizzle-orm";

import { account } from "../db/schema/accounts";
import { institutionConnection } from "../db/schema/institution-connections";
import { providerConnection } from "../db/schema/provider-connections";
import {
  cleanupAccountDocuments,
  cleanupInstitutionConnectionDocuments,
} from "../lib/cleanup-documents";
import { createDb } from "../lib/db";
import { pullSnapTradeConnectionHoldings, syncSnapTradeHoldings } from "../lib/snaptrade-holdings";
import { syncConnectionData } from "../lib/sync-connection-data";
import { getProvider } from "../providers";
import type {
  EnableBankingWebhookEvent,
  ProviderUserCleanupEvent,
  SnapTradeWebhookEvent,
  TellerWebhookEvent,
  UserFilesCleanupEvent,
  WebhookEvent,
} from "./types";

export async function handleWebhookQueue(
  batch: MessageBatch<WebhookEvent>,
  env: Env,
): Promise<void> {
  for (const message of batch.messages) {
    try {
      const event = message.body;
      console.log("[Queue] processing event", {
        source: event.source,
        eventType: "eventType" in event ? event.eventType : undefined,
      });

      switch (event.source) {
        case "snaptrade":
          await processSnapTradeEvent(event);
          break;
        case "enablebanking":
          await processEnableBankingEvent(event);
          break;
        case "teller":
          await processTellerEvent(event);
          break;
        case "provider-user-cleanup":
          await processProviderUserCleanupEvent(event);
          break;
        case "user-files-cleanup":
          await processUserFilesCleanupEvent(event, env);
          break;
        default:
          console.error("Unknown webhook source:", event);
      }

      message.ack();
      console.log("[Queue] event processed", {
        source: event.source,
        eventType: "eventType" in event ? event.eventType : undefined,
      });
    } catch (error) {
      console.error("Failed to process webhook event:", error);
      message.retry();
    }
  }
}

async function processProviderUserCleanupEvent(event: ProviderUserCleanupEvent): Promise<void> {
  if (event.eventType !== "deregister-user") return;

  const { userId, userSecret, connectionIds } = event.payload;
  const options =
    userSecret != null || (connectionIds != null && connectionIds.length > 0)
      ? { userSecret, connectionIds }
      : undefined;

  const provider = getProvider(event.payload.providerName);
  const result = await provider.deregisterUser(userId, options);

  if (!result.success) {
    throw new Error(
      `Failed to deregister provider user ${userId} on ${event.payload.providerName}: ${
        result.error ?? "unknown error"
      }`,
    );
  }
}

async function processUserFilesCleanupEvent(event: UserFilesCleanupEvent, env: Env): Promise<void> {
  if (event.eventType !== "delete-user-files") return;
  const prefix = `${event.payload.userId}/`;
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const listed = await env.USER_BUCKET.list({
      prefix,
      cursor,
    });

    for (const object of listed.objects) {
      await env.USER_BUCKET.delete(object.key);
    }

    if (listed.truncated) {
      hasMore = true;
      cursor = listed.cursor;
    } else {
      hasMore = false;
      cursor = undefined;
    }
  }
}

// --- SnapTrade processing ---

async function processSnapTradeEvent(event: SnapTradeWebhookEvent) {
  const { eventType, payload } = event;

  switch (eventType) {
    case "CONNECTION_ADDED": {
      await handleSnapTradeConnectionAdded(payload);
      break;
    }

    case "CONNECTION_DELETED": {
      await handleSnapTradeConnectionDeleted(payload);
      break;
    }

    case "CONNECTION_BROKEN": {
      await handleSnapTradeConnectionBroken(payload);
      break;
    }

    case "CONNECTION_FIXED": {
      await handleSnapTradeConnectionFixed(payload);
      break;
    }

    case "NEW_ACCOUNT_AVAILABLE":
    case "ACCOUNT_TRANSACTIONS_INITIAL_UPDATE":
    case "ACCOUNT_TRANSACTIONS_UPDATED":
    case "ACCOUNT_HOLDINGS_UPDATED": {
      await handleSnapTradeAccountUpdate(eventType, payload);
      break;
    }

    case "ACCOUNT_REMOVED": {
      await handleSnapTradeAccountRemoved(payload);
      break;
    }

    case "USER_DELETED": {
      await handleSnapTradeUserDeleted(payload);
      break;
    }
  }
}

async function handleSnapTradeConnectionAdded(
  payload: SnapTradeWebhookEvent["payload"],
): Promise<void> {
  await pullSnapTradeConnectionHoldings(payload);
}

async function handleSnapTradeConnectionDeleted(
  payload: SnapTradeWebhookEvent["payload"],
): Promise<void> {
  if (!payload.brokerageAuthorizationId) return;
  const db = createDb();

  const connections = await db.query.institutionConnection.findMany({
    where: { connection_id: payload.brokerageAuthorizationId },
    columns: { id: true },
  });
  await Promise.all(connections.map((conn) => cleanupInstitutionConnectionDocuments(db, conn.id)));

  await db
    .delete(institutionConnection)
    .where(eq(institutionConnection.connection_id, payload.brokerageAuthorizationId));
}

async function handleSnapTradeConnectionBroken(
  payload: SnapTradeWebhookEvent["payload"],
): Promise<void> {
  if (!payload.brokerageAuthorizationId) return;
  const db = createDb();
  await db
    .update(institutionConnection)
    .set({ broken: true })
    .where(eq(institutionConnection.connection_id, payload.brokerageAuthorizationId));
}

async function handleSnapTradeConnectionFixed(
  payload: SnapTradeWebhookEvent["payload"],
): Promise<void> {
  if (!payload.brokerageAuthorizationId) return;
  const db = createDb();
  await db
    .update(institutionConnection)
    .set({ broken: false })
    .where(eq(institutionConnection.connection_id, payload.brokerageAuthorizationId));
}

async function handleSnapTradeAccountUpdate(
  eventType:
    | "NEW_ACCOUNT_AVAILABLE"
    | "ACCOUNT_TRANSACTIONS_INITIAL_UPDATE"
    | "ACCOUNT_TRANSACTIONS_UPDATED"
    | "ACCOUNT_HOLDINGS_UPDATED",
  payload: SnapTradeWebhookEvent["payload"],
): Promise<void> {
  await syncSnapTradeHoldings(payload, eventType);
  console.log("[SnapTrade queue] valuation sync complete", {
    eventType,
    userId: payload.userId,
    accountId: payload.accountId,
  });
}

async function handleSnapTradeAccountRemoved(
  payload: SnapTradeWebhookEvent["payload"],
): Promise<void> {
  if (!payload.accountId) return;
  const db = createDb();

  const existing = await db.query.account.findMany({
    where: {
      provider_account_id: payload.accountId,
      user_id: payload.userId,
    },
    columns: { id: true, user_id: true },
  });

  await Promise.all(existing.map((acc) => cleanupAccountDocuments(db, acc.user_id, acc.id)));

  await db
    .delete(account)
    .where(
      and(eq(account.provider_account_id, payload.accountId), eq(account.user_id, payload.userId)),
    );
}

async function handleSnapTradeUserDeleted(
  payload: SnapTradeWebhookEvent["payload"],
): Promise<void> {
  const db = createDb();
  const providerRecord = await db.query.provider.findFirst({
    where: { name: "SnapTrade" },
  });
  if (!providerRecord) return;

  const providerConn = await db.query.providerConnection.findFirst({
    where: {
      user_id: payload.userId,
      provider_id: providerRecord.id,
    },
  });
  if (!providerConn) return;

  const connections = await db.query.institutionConnection.findMany({
    where: { provider_connection_id: providerConn.id },
    columns: { id: true },
  });
  await Promise.all(connections.map((conn) => cleanupInstitutionConnectionDocuments(db, conn.id)));

  await db.delete(providerConnection).where(eq(providerConnection.id, providerConn.id));
  console.log("[SnapTrade queue] cleared local connection after USER_DELETED", {
    userId: payload.userId,
    providerConnectionId: providerConn.id,
  });
}

// --- EnableBanking processing ---

async function processEnableBankingEvent(event: EnableBankingWebhookEvent) {
  if (event.eventType !== "CONNECTION_CREATED") return;

  const { userId, institutionConnectionId } = event.payload;
  await syncConnectionData({
    providerName: "EnableBanking",
    userId,
    institutionConnectionId,
  });
}

// --- Teller processing ---

async function processTellerEvent(event: TellerWebhookEvent) {
  switch (event.eventType) {
    case "ENROLLMENT_CREATED":
      await handleTellerEnrollmentCreated(event.payload);
      break;
    case "TRANSACTIONS_UPDATED":
      await handleTellerTransactionsUpdated(event.payload);
      break;
    case "ENROLLMENT_DISCONNECTED":
      await handleTellerEnrollmentDisconnected(event.payload);
      break;
  }
}

async function handleTellerEnrollmentCreated(
  payload: TellerWebhookEvent["payload"],
): Promise<void> {
  await syncConnectionData({
    providerName: "Teller",
    userId: payload.userId,
    institutionConnectionId: payload.institutionConnectionId,
  });
}

async function handleTellerTransactionsUpdated(
  payload: TellerWebhookEvent["payload"],
): Promise<void> {
  await syncConnectionData({
    providerName: "Teller",
    userId: payload.userId,
    institutionConnectionId: payload.institutionConnectionId,
  });
}

async function handleTellerEnrollmentDisconnected(
  payload: TellerWebhookEvent["payload"],
): Promise<void> {
  const { institutionConnectionId } = payload;
  const db = createDb();

  await db
    .update(institutionConnection)
    .set({ broken: true })
    .where(eq(institutionConnection.id, institutionConnectionId));

  console.log("[Teller queue] enrollment marked as disconnected", {
    institutionConnectionId,
  });
}
