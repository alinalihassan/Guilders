import { eq } from "drizzle-orm";

import { institutionConnection } from "../../db/schema/institution-connections";
import { institution } from "../../db/schema/institutions";
import { providerConnection } from "../../db/schema/provider-connections";
import { createDb } from "../../lib/db";
import { syncConnectionData } from "../../lib/sync-connection-data";
import { LunchFlowApiError, listAccounts } from "./client";
import {
  isActiveLunchFlowAccount,
  lunchFlowInstitutionKey,
  pickLogoUrl,
  truncateName,
} from "./map";

export type ConnectLunchFlowResult = {
  accounts: number;
  institutions: number;
};

export async function connectLunchFlow(params: {
  userId: string;
  providerId: number;
  apiKey: string;
  fallbackLogoUrl: string;
}): Promise<ConnectLunchFlowResult> {
  const accounts = await listAccounts(params.apiKey);
  const activeAccounts = accounts.filter((account) => isActiveLunchFlowAccount(account.status));

  const db = createDb();
  const [providerConn] = await db
    .insert(providerConnection)
    .values({
      user_id: params.userId,
      provider_id: params.providerId,
      secret: params.apiKey,
    })
    .onConflictDoUpdate({
      target: [providerConnection.provider_id, providerConnection.user_id],
      set: { secret: params.apiKey, updated_at: new Date() },
    })
    .returning();

  if (!providerConn) throw new Error("Failed to save Lunch Flow connection");

  const grouped = new Map<string, (typeof activeAccounts)[number]>();
  for (const account of activeAccounts) {
    const key = lunchFlowInstitutionKey(account);
    if (!grouped.has(key)) grouped.set(key, account);
  }

  const institutionConnectionIds: number[] = [];

  for (const [providerInstitutionId, sample] of grouped) {
    const [institutionRecord] = await db
      .insert(institution)
      .values({
        name: truncateName(sample.institution_name, 100),
        logo_url: pickLogoUrl(sample.institution_logo, params.fallbackLogoUrl),
        provider_id: params.providerId,
        provider_institution_id: providerInstitutionId,
        enabled: true,
        country: null,
      })
      .onConflictDoUpdate({
        target: [institution.provider_id, institution.provider_institution_id],
        set: {
          name: truncateName(sample.institution_name, 100),
          logo_url: pickLogoUrl(sample.institution_logo, params.fallbackLogoUrl),
        },
      })
      .returning();

    if (!institutionRecord) continue;

    const connectionId = `lunchflow:${params.userId}:${providerInstitutionId}`;
    const existing = await db.query.institutionConnection.findFirst({
      where: {
        institution_id: institutionRecord.id,
        provider_connection_id: providerConn.id,
      },
    });

    if (existing) {
      await db
        .update(institutionConnection)
        .set({ connection_id: connectionId, broken: false })
        .where(eq(institutionConnection.id, existing.id));
      institutionConnectionIds.push(existing.id);
      continue;
    }

    const [created] = await db
      .insert(institutionConnection)
      .values({
        institution_id: institutionRecord.id,
        provider_connection_id: providerConn.id,
        connection_id: connectionId,
      })
      .returning({ id: institutionConnection.id });

    if (created) institutionConnectionIds.push(created.id);
  }

  for (const institutionConnectionId of institutionConnectionIds) {
    try {
      await syncConnectionData({
        providerName: "LunchFlow",
        userId: params.userId,
        institutionConnectionId,
      });
    } catch (error) {
      console.error("[LunchFlow] Failed to sync institution connection", {
        institutionConnectionId,
        error,
      });
    }
  }

  return {
    accounts: activeAccounts.length,
    institutions: institutionConnectionIds.length,
  };
}

export function isInvalidLunchFlowKey(error: unknown): boolean {
  return error instanceof LunchFlowApiError && (error.status === 401 || error.status === 403);
}
