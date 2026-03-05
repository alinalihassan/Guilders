import { eq } from "drizzle-orm";

import { institutionConnection } from "../db/schema/institution-connections";
import { providerConnection } from "../db/schema/provider-connections";
import { provider } from "../db/schema/providers";
import { PROVIDER_NAMES, PROVIDERS_REQUIRING_SECRET, type ProviderName } from "../providers/types";
import type { ProviderUserCleanupEvent, UserFilesCleanupEvent } from "../queues/types";
import { createDb } from "./db";

function isProviderName(name: string): name is ProviderName {
  return (PROVIDER_NAMES as readonly string[]).includes(name);
}

export async function enqueueUserDeleteCleanupJobs(env: Env, userId: string): Promise<void> {
  await enqueueProviderCleanupJobs(env, userId);
  await enqueueUserFilesCleanupJob(env, userId);
}

async function enqueueProviderCleanupJobs(env: Env, userId: string): Promise<void> {
  const db = createDb();
  const providerConnections = await db
    .select({
      providerConnectionId: providerConnection.id,
      providerSecret: providerConnection.secret,
      providerName: provider.name,
    })
    .from(providerConnection)
    .innerJoin(provider, eq(providerConnection.provider_id, provider.id))
    .where(eq(providerConnection.user_id, userId));

  for (const connection of providerConnections) {
    if (!isProviderName(connection.providerName)) continue;
    const needsSecret = PROVIDERS_REQUIRING_SECRET.includes(connection.providerName);
    if (needsSecret && !connection.providerSecret) continue;

    const payload: ProviderUserCleanupEvent["payload"] = {
      providerName: connection.providerName,
      userId,
    };
    if (connection.providerSecret) payload.userSecret = connection.providerSecret;
    if (connection.providerName === "EnableBanking") {
      const rows = await db
        .select({ connectionId: institutionConnection.connection_id })
        .from(institutionConnection)
        .where(eq(institutionConnection.provider_connection_id, connection.providerConnectionId));
      const ids = rows.map((r) => r.connectionId).filter((id): id is string => id != null);
      if (ids.length > 0) payload.connectionIds = ids;
    }

    const event: ProviderUserCleanupEvent = {
      source: "provider-user-cleanup",
      eventType: "deregister-user",
      payload,
    };

    await env.WEBHOOK_QUEUE.send(event);
  }
}

async function enqueueUserFilesCleanupJob(env: Env, userId: string): Promise<void> {
  const event: UserFilesCleanupEvent = {
    source: "user-files-cleanup",
    eventType: "delete-user-files",
    payload: { userId },
  };

  await env.WEBHOOK_QUEUE.send(event);
}
