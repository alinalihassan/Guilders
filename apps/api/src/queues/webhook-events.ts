import { eq } from "drizzle-orm";
import { asset } from "../db/schema/assets";
import { institutionConnection } from "../db/schema/institution-connections";
import { db } from "../lib/db";
import type {
  SnapTradeWebhookEvent,
  WebhookEvent,
} from "./types";

export async function handleWebhookQueue(
  batch: MessageBatch<WebhookEvent>,
  _env: Env,
): Promise<void> {
  for (const message of batch.messages) {
    try {
      const event = message.body;

      switch (event.source) {
        case "snaptrade":
          await processSnapTradeEvent(event);
          break;
        default:
          console.error("Unknown webhook source:", event);
      }

      message.ack();
    } catch (error) {
      console.error("Failed to process webhook event:", error);
      message.retry();
    }
  }
}

// --- SnapTrade processing ---

async function processSnapTradeEvent(event: SnapTradeWebhookEvent) {
  const { eventType, payload } = event;

  switch (eventType) {
    case "CONNECTION_ADDED": {
      const provider = await db.query.provider.findFirst({
        where: { name: "SnapTrade" },
      });
      if (!provider) throw new Error("SnapTrade provider not found");

      if (!payload.brokerageId) throw new Error("Missing brokerageId");
      const inst = await db.query.institution.findFirst({
        where: {
          provider_id: provider.id,
          provider_institution_id: payload.brokerageId,
        },
      });
      if (!inst) throw new Error("Institution not found");

      const providerConn = await db.query.providerConnection.findFirst({
        where: {
          user_id: payload.userId,
          provider_id: provider.id,
        },
      });
      if (!providerConn) throw new Error("Provider connection not found");

      await db.insert(institutionConnection).values({
        institution_id: inst.id,
        provider_connection_id: providerConn.id,
        connection_id: payload.brokerageAuthorizationId,
      });
      break;
    }

    case "CONNECTION_DELETED": {
      if (!payload.brokerageAuthorizationId) break;
      await db
        .delete(institutionConnection)
        .where(
          eq(
            institutionConnection.connection_id,
            payload.brokerageAuthorizationId,
          ),
        );
      break;
    }

    case "CONNECTION_BROKEN": {
      if (!payload.brokerageAuthorizationId) break;
      await db
        .update(institutionConnection)
        .set({ broken: true })
        .where(
          eq(
            institutionConnection.connection_id,
            payload.brokerageAuthorizationId,
          ),
        );
      break;
    }

    case "CONNECTION_FIXED": {
      if (!payload.brokerageAuthorizationId) break;
      await db
        .update(institutionConnection)
        .set({ broken: false })
        .where(
          eq(
            institutionConnection.connection_id,
            payload.brokerageAuthorizationId,
          ),
        );
      break;
    }

    case "NEW_ACCOUNT_AVAILABLE":
    case "ACCOUNT_TRANSACTIONS_INITIAL_UPDATE":
    case "ACCOUNT_TRANSACTIONS_UPDATED":
    case "ACCOUNT_HOLDINGS_UPDATED": {
      // TODO: Implement SnapTrade account/transaction sync directly
      // For now, log the event. When SnapTrade SDK is added, fetch & upsert here.
      console.log(
        `SnapTrade sync event: ${eventType} for user=${payload.userId}`,
      );
      break;
    }

    case "ACCOUNT_REMOVED": {
      if (!payload.accountId) break;
      await db
        .delete(asset)
        .where(eq(asset.provider_account_id, payload.accountId));
      break;
    }
  }
}

