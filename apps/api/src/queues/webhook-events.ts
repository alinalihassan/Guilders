import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { asset } from "../db/schema/assets";
import { AccountSubtypeEnum, AccountTypeEnum } from "../db/schema/enums";
import { institutionConnection } from "../db/schema/institution-connections";
import { db } from "../lib/db";
import { getProvider } from "../providers";
import { getSnapTradeClient } from "../providers/snaptrade/client";
import type {
  ProviderUserCleanupEvent,
  SnapTradeWebhookEvent,
  UserFilesCleanupEvent,
  WebhookEvent,
} from "./types";

export async function handleWebhookQueue(
  batch: MessageBatch<WebhookEvent>,
  _env: Env,
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
        case "provider-user-cleanup":
          await processProviderUserCleanupEvent(event);
          break;
        case "user-files-cleanup":
          await processUserFilesCleanupEvent(event);
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

async function processProviderUserCleanupEvent(
  event: ProviderUserCleanupEvent,
): Promise<void> {
  if (event.eventType !== "deregister-user") return;

  const provider = getProvider(event.payload.providerName);
  const result = await provider.deregisterUser(event.payload.userId);

  if (!result.success) {
    throw new Error(
      `Failed to deregister provider user ${event.payload.userId} on ${event.payload.providerName}: ${result.error ?? "unknown error"
      }`,
    );
  }
}

async function processUserFilesCleanupEvent(
  event: UserFilesCleanupEvent,
): Promise<void> {
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
  }
}

async function handleSnapTradeConnectionAdded(
  payload: SnapTradeWebhookEvent["payload"],
): Promise<void> {
  const providerRecord = await db.query.provider.findFirst({
    where: { name: "SnapTrade" },
  });
  if (!providerRecord) throw new Error("SnapTrade provider not found");

  if (!payload.brokerageId) throw new Error("Missing brokerageId");
  const institutionRecord = await db.query.institution.findFirst({
    where: {
      provider_id: providerRecord.id,
      provider_institution_id: payload.brokerageId,
    },
  });
  if (!institutionRecord) throw new Error("Institution not found");

  const providerConn = await db.query.providerConnection.findFirst({
    where: {
      user_id: payload.userId,
      provider_id: providerRecord.id,
    },
  });
  if (!providerConn) throw new Error("Provider connection not found");

  const [existingConnection] = await db
    .select({ id: institutionConnection.id })
    .from(institutionConnection)
    .where(
      and(
        eq(institutionConnection.institution_id, institutionRecord.id),
        eq(institutionConnection.provider_connection_id, providerConn.id),
      ),
    )
    .limit(1);

  if (existingConnection) {
    await db
      .update(institutionConnection)
      .set({
        connection_id: payload.brokerageAuthorizationId ?? null,
        broken: false,
      })
      .where(eq(institutionConnection.id, existingConnection.id));
  } else {
    await db.insert(institutionConnection).values({
      institution_id: institutionRecord.id,
      provider_connection_id: providerConn.id,
      connection_id: payload.brokerageAuthorizationId,
    });
  }
}

async function handleSnapTradeConnectionDeleted(
  payload: SnapTradeWebhookEvent["payload"],
): Promise<void> {
  if (!payload.brokerageAuthorizationId) return;
  await db
    .delete(institutionConnection)
    .where(
      eq(institutionConnection.connection_id, payload.brokerageAuthorizationId),
    );
}

async function handleSnapTradeConnectionBroken(
  payload: SnapTradeWebhookEvent["payload"],
): Promise<void> {
  if (!payload.brokerageAuthorizationId) return;
  await db
    .update(institutionConnection)
    .set({ broken: true })
    .where(
      eq(institutionConnection.connection_id, payload.brokerageAuthorizationId),
    );
}

async function handleSnapTradeConnectionFixed(
  payload: SnapTradeWebhookEvent["payload"],
): Promise<void> {
  if (!payload.brokerageAuthorizationId) return;
  await db
    .update(institutionConnection)
    .set({ broken: false })
    .where(
      eq(institutionConnection.connection_id, payload.brokerageAuthorizationId),
    );
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
  await db.delete(asset).where(eq(asset.provider_account_id, payload.accountId));
}

async function syncSnapTradeHoldings(
  payload: SnapTradeWebhookEvent["payload"],
  trigger:
    | "NEW_ACCOUNT_AVAILABLE"
    | "ACCOUNT_HOLDINGS_UPDATED"
    | "ACCOUNT_TRANSACTIONS_INITIAL_UPDATE"
    | "ACCOUNT_TRANSACTIONS_UPDATED",
): Promise<void> {
  if (!payload.accountId) {
    console.log("[SnapTrade holdings] skipped: missing accountId", {
      userId: payload.userId,
      brokerageId: payload.brokerageId,
    });
    return;
  }
  if (!payload.brokerageId) {
    console.log("[SnapTrade holdings] skipped: missing brokerageId", {
      userId: payload.userId,
      accountId: payload.accountId,
    });
    return;
  }

  const providerRecord = await db.query.provider.findFirst({
    where: { name: "SnapTrade" },
  });
  if (!providerRecord) throw new Error("SnapTrade provider not found");

  const providerConn = await db.query.providerConnection.findFirst({
    where: {
      provider_id: providerRecord.id,
      user_id: payload.userId,
    },
  });
  if (!providerConn?.secret)
    throw new Error("SnapTrade provider connection secret not found");

  const institutionRecord = await db.query.institution.findFirst({
    where: {
      provider_id: providerRecord.id,
      provider_institution_id: payload.brokerageId,
    },
  });
  if (!institutionRecord) throw new Error("SnapTrade institution not found");

  const institutionConn = await db.query.institutionConnection.findFirst({
    where: {
      provider_connection_id: providerConn.id,
      institution_id: institutionRecord.id,
    },
  });
  if (!institutionConn)
    throw new Error("SnapTrade institution connection not found");

  const client = getSnapTradeClient();
  const response = await client.accountInformation.getUserHoldings({
    userId: payload.userId,
    userSecret: providerConn.secret,
    accountId: payload.accountId,
  });

  const account = response.data?.account;
  if (!account) {
    throw new Error("SnapTrade holdings missing account payload");
  }

  if (trigger === "NEW_ACCOUNT_AVAILABLE") {
    const holdingsSynced =
      account.sync_status?.holdings?.initial_sync_completed ?? false;
    const txSynced =
      account.sync_status?.transactions?.initial_sync_completed ?? false;
    if (!holdingsSynced || !txSynced) {
      console.log("[SnapTrade holdings] NEW_ACCOUNT_AVAILABLE skipped", {
        reason: "initial sync not completed",
        userId: payload.userId,
        accountId: payload.accountId,
      });
      return;
    }
  }

  const totalValue = account.balance?.total?.amount ?? 0;
  const totalCurrency = account.balance?.total?.currency?.toUpperCase() ?? "EUR";
  const parentName = account.institution_name ?? "SnapTrade Account";
  const totalCost =
    response.data?.positions?.reduce(
      (acc, position) =>
        acc + (position.average_purchase_price ?? 0) * (position.units ?? 0),
      0,
    ) ?? totalValue;

  const [existingParent] = await db
    .select({ id: asset.id })
    .from(asset)
    .where(
      and(
        eq(asset.institution_connection_id, institutionConn.id),
        eq(asset.provider_account_id, account.id),
      ),
    )
    .limit(1);

  let parentId: number;

  if (existingParent) {
    await db
      .update(asset)
      .set({
        type: AccountTypeEnum.asset,
        subtype: AccountSubtypeEnum.brokerage,
        user_id: payload.userId,
        name: parentName,
        value: totalValue.toString(),
        currency: totalCurrency,
        cost: totalCost.toString(),
        institution_connection_id: institutionConn.id,
        provider_account_id: account.id,
        image: institutionRecord.logo_url,
        parent: null,
        updated_at: new Date(),
      })
      .where(eq(asset.id, existingParent.id));

    parentId = existingParent.id;
  } else {
    const [createdParent] = await db
      .insert(asset)
      .values({
        type: AccountTypeEnum.asset,
        subtype: AccountSubtypeEnum.brokerage,
        user_id: payload.userId,
        name: parentName,
        value: totalValue.toString(),
        currency: totalCurrency,
        cost: totalCost.toString(),
        institution_connection_id: institutionConn.id,
        provider_account_id: account.id,
        image: institutionRecord.logo_url,
      })
      .returning({ id: asset.id });

    if (!createdParent)
      throw new Error("Failed to create SnapTrade parent asset");
    parentId = createdParent.id;
  }

  await db
    .delete(asset)
    .where(and(eq(asset.parent, parentId), eq(asset.user_id, payload.userId)));

  const positions = response.data?.positions ?? [];
  const positionsValue = positions.reduce((acc, position) => {
    const units = position.units ?? 0;
    const price = position.price ?? 0;
    return acc + price * units;
  }, 0);
  const cashValue = totalValue - positionsValue;

  // Add cash as a child asset so the portfolio reflects liquid balance explicitly.
  await db.insert(asset).values({
    type: AccountTypeEnum.asset,
    subtype: AccountSubtypeEnum.depository,
    user_id: payload.userId,
    parent: parentId,
    name: "Cash",
    value: cashValue.toString(),
    cost: cashValue.toString(),
    units: null,
    currency: totalCurrency,
    ticker: null,
    institution_connection_id: institutionConn.id,
    image: institutionRecord.logo_url,
    provider_account_id: null,
  });

  for (const position of positions) {
    const units = position.units ?? 0;
    const price = position.price ?? 0;
    const average = position.average_purchase_price ?? 0;
    const symbol = position.symbol?.symbol;

    await db.insert(asset).values({
      type: AccountTypeEnum.asset,
      subtype: AccountSubtypeEnum.stock,
      user_id: payload.userId,
      parent: parentId,
      name: symbol?.description ?? "Stock",
      value: (price * units).toString(),
      cost: (average * units).toString(),
      units: units.toString(),
      currency: symbol?.currency?.code?.toUpperCase() ?? totalCurrency,
      ticker: symbol?.raw_symbol ?? null,
      institution_connection_id: institutionConn.id,
      image: symbol?.logo_url ?? null,
      provider_account_id: null,
    });
  }

  const parentValue = cashValue + positionsValue;

  await db
    .update(asset)
    .set({
      value: parentValue.toString(),
      updated_at: new Date(),
    })
    .where(eq(asset.id, parentId));

  console.log("[SnapTrade holdings] sync complete", {
    userId: payload.userId,
    accountId: payload.accountId,
    institutionConnectionId: institutionConn.id,
    parentId,
    positions: positions.length,
  });
}
