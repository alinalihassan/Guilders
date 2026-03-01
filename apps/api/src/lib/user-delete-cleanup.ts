import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";

import { providerConnection } from "../db/schema/provider-connections";
import { provider } from "../db/schema/providers";
import type { ProviderName } from "../providers/types";
import type { ProviderUserCleanupEvent, UserFilesCleanupEvent } from "../queues/types";
import { createDb } from "./db";

function isProviderName(name: string): name is ProviderName {
  return name === "EnableBanking" || name === "SnapTrade" || name === "Teller";
}

export async function enqueueUserDeleteCleanupJobs(userId: string): Promise<void> {
  if (!env?.WEBHOOK_QUEUE) return;

  await Promise.all([enqueueProviderCleanupJobs(userId), enqueueUserFilesCleanupJob(userId)]);
}

async function enqueueProviderCleanupJobs(userId: string): Promise<void> {
  try {
    const db = createDb();
    const providerConnections = await db
      .select({
        providerUserId: providerConnection.secret,
        providerName: provider.name,
      })
      .from(providerConnection)
      .innerJoin(provider, eq(providerConnection.provider_id, provider.id))
      .where(eq(providerConnection.user_id, userId));

    for (const connection of providerConnections) {
      if (!connection.providerUserId) continue;
      if (!isProviderName(connection.providerName)) continue;

      const event: ProviderUserCleanupEvent = {
        source: "provider-user-cleanup",
        eventType: "deregister-user",
        payload: {
          providerName: connection.providerName,
          userId,
        },
      };

      await env.WEBHOOK_QUEUE.send(event);
    }
  } catch (error) {
    console.error("Failed to enqueue provider cleanup jobs:", {
      userId,
      error: error instanceof Error ? error.message : error,
    });
  }
}

async function enqueueUserFilesCleanupJob(userId: string): Promise<void> {
  try {
    const event: UserFilesCleanupEvent = {
      source: "user-files-cleanup",
      eventType: "delete-user-files",
      payload: { userId },
    };

    await env.WEBHOOK_QUEUE.send(event);
  } catch (error) {
    console.error("Failed to enqueue user files cleanup job:", {
      userId,
      error: error instanceof Error ? error.message : error,
    });
  }
}
