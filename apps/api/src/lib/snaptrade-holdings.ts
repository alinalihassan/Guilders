import { and, eq } from "drizzle-orm";

import { account } from "../db/schema/accounts";
import { AccountSubtypeEnum, AccountTypeEnum } from "../db/schema/enums";
import { institutionConnection } from "../db/schema/institution-connections";
import { getSnapTradeClient } from "../providers/snaptrade/client";
import type { SnapTradeWebhookPayload } from "../queues/types";
import { createDb } from "./db";
import { SYNCED_ACCOUNT_LOCKED_ATTRIBUTES } from "./locked-attributes";

export type SnapTradeHoldingsTrigger =
  | "NEW_ACCOUNT_AVAILABLE"
  | "ACCOUNT_HOLDINGS_UPDATED"
  | "ACCOUNT_TRANSACTIONS_INITIAL_UPDATE"
  | "ACCOUNT_TRANSACTIONS_UPDATED";

export async function ensureSnapTradeInstitutionConnection(payload: SnapTradeWebhookPayload) {
  const db = createDb();
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
    if (payload.brokerageAuthorizationId) {
      await db
        .update(institutionConnection)
        .set({
          connection_id: payload.brokerageAuthorizationId,
          broken: false,
        })
        .where(eq(institutionConnection.id, existingConnection.id));
    }
    return {
      providerConn,
      institutionRecord,
      institutionConn: existingConnection,
    };
  }

  const [created] = await db
    .insert(institutionConnection)
    .values({
      institution_id: institutionRecord.id,
      provider_connection_id: providerConn.id,
      connection_id: payload.brokerageAuthorizationId,
    })
    .returning({ id: institutionConnection.id });

  if (!created) throw new Error("Failed to create SnapTrade institution connection");

  return {
    providerConn,
    institutionRecord,
    institutionConn: created,
  };
}

export async function syncSnapTradeHoldings(
  payload: SnapTradeWebhookPayload,
  trigger: SnapTradeHoldingsTrigger,
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

  const db = createDb();

  const { providerConn, institutionConn, institutionRecord } =
    await ensureSnapTradeInstitutionConnection(payload);
  if (!providerConn.secret) throw new Error("SnapTrade provider connection secret not found");

  const client = getSnapTradeClient();
  if (!client) {
    console.warn("[SnapTrade] not configured, skipping holdings sync");
    return;
  }
  const response = await client.accountInformation.getUserHoldings({
    userId: payload.userId,
    userSecret: providerConn.secret,
    accountId: payload.accountId,
  });

  const snapAccount = response.data?.account;
  if (!snapAccount) {
    throw new Error("SnapTrade holdings missing account payload");
  }

  if (trigger === "NEW_ACCOUNT_AVAILABLE") {
    const holdingsSynced = snapAccount.sync_status?.holdings?.initial_sync_completed ?? false;
    const txSynced = snapAccount.sync_status?.transactions?.initial_sync_completed ?? false;
    if (!holdingsSynced || !txSynced) {
      console.log("[SnapTrade holdings] NEW_ACCOUNT_AVAILABLE skipped", {
        reason: "initial sync not completed",
        userId: payload.userId,
        accountId: payload.accountId,
      });
      return;
    }
  }

  const totalValue = snapAccount.balance?.total?.amount ?? 0;
  const totalCurrency = snapAccount.balance?.total?.currency?.toUpperCase() ?? "EUR";
  const parentName = snapAccount.institution_name ?? "SnapTrade Account";
  const totalCost =
    response.data?.positions?.reduce(
      (acc, position) => acc + (position.average_purchase_price ?? 0) * (position.units ?? 0),
      0,
    ) ?? totalValue;

  const [existingParent] = await db
    .select({ id: account.id })
    .from(account)
    .where(
      and(
        eq(account.institution_connection_id, institutionConn.id),
        eq(account.provider_account_id, snapAccount.id),
      ),
    )
    .limit(1);

  let parentId: number;

  if (existingParent) {
    await db
      .update(account)
      .set({
        type: AccountTypeEnum.asset,
        subtype: AccountSubtypeEnum.brokerage,
        user_id: payload.userId,
        name: parentName,
        value: totalValue.toString(),
        currency: totalCurrency,
        cost: totalCost.toString(),
        institution_connection_id: institutionConn.id,
        provider_account_id: snapAccount.id,
        image: institutionRecord.logo_url,
        locked_attributes: SYNCED_ACCOUNT_LOCKED_ATTRIBUTES,
        parent: null,
        updated_at: new Date(),
      })
      .where(eq(account.id, existingParent.id));

    parentId = existingParent.id;
  } else {
    const [createdParent] = await db
      .insert(account)
      .values({
        type: AccountTypeEnum.asset,
        subtype: AccountSubtypeEnum.brokerage,
        user_id: payload.userId,
        name: parentName,
        value: totalValue.toString(),
        currency: totalCurrency,
        cost: totalCost.toString(),
        institution_connection_id: institutionConn.id,
        provider_account_id: snapAccount.id,
        image: institutionRecord.logo_url,
        locked_attributes: SYNCED_ACCOUNT_LOCKED_ATTRIBUTES,
      })
      .returning({ id: account.id });

    if (!createdParent) throw new Error("Failed to create SnapTrade parent account");
    parentId = createdParent.id;
  }

  await db
    .delete(account)
    .where(and(eq(account.parent, parentId), eq(account.user_id, payload.userId)));

  const positions = response.data?.positions ?? [];
  const positionsValue = positions.reduce((acc, position) => {
    const units = position.units ?? 0;
    const price = position.price ?? 0;
    return acc + price * units;
  }, 0);
  const cashValue = totalValue - positionsValue;

  await db.insert(account).values({
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
    locked_attributes: SYNCED_ACCOUNT_LOCKED_ATTRIBUTES,
  });

  for (const position of positions) {
    const units = position.units ?? 0;
    const price = position.price ?? 0;
    const average = position.average_purchase_price ?? 0;
    const symbol = position.symbol?.symbol;

    await db.insert(account).values({
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
      locked_attributes: SYNCED_ACCOUNT_LOCKED_ATTRIBUTES,
    });
  }

  const parentValue = cashValue + positionsValue;

  await db
    .update(account)
    .set({
      value: parentValue.toString(),
      updated_at: new Date(),
    })
    .where(eq(account.id, parentId));

  console.log("[SnapTrade holdings] sync complete", {
    userId: payload.userId,
    accountId: payload.accountId,
    institutionConnectionId: institutionConn.id,
    parentId,
    positions: positions.length,
  });
}

export async function pullSnapTradeConnectionHoldings(
  payload: SnapTradeWebhookPayload,
): Promise<void> {
  const { providerConn } = await ensureSnapTradeInstitutionConnection(payload);
  if (!providerConn.secret || !payload.brokerageAuthorizationId) return;

  const client = getSnapTradeClient();
  if (!client) {
    console.warn("[SnapTrade] not configured, skipping connection holdings pull");
    return;
  }

  const accounts = await client.connections.listBrokerageAuthorizationAccounts({
    authorizationId: payload.brokerageAuthorizationId,
    userId: payload.userId,
    userSecret: providerConn.secret,
  });

  for (const snapAccount of accounts.data ?? []) {
    if (!snapAccount.id) continue;
    await syncSnapTradeHoldings(
      {
        userId: payload.userId,
        brokerageId: payload.brokerageId,
        brokerageAuthorizationId: payload.brokerageAuthorizationId,
        accountId: snapAccount.id,
      },
      "ACCOUNT_HOLDINGS_UPDATED",
    );
  }
}
