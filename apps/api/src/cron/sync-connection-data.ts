import { createDb } from "../lib/db";
import { syncConnectionData } from "../lib/sync-connection-data";
import type { ProviderName } from "../providers/types";

const PULL_BASED_PROVIDERS: ProviderName[] = ["EnableBanking", "Teller"];

export async function syncConnectionDataCron() {
  const db = createDb();

  const providers = await db.query.provider.findMany({
    where: (fields, { inArray }) => inArray(fields.name, PULL_BASED_PROVIDERS),
  });

  if (!providers.length) {
    console.log("[sync-connection-data cron] no pull-based providers found");
    return;
  }

  const providerIds = providers.map((p) => p.id);

  const providerConnections = await db.query.providerConnection.findMany({
    where: (fields, { inArray }) => inArray(fields.provider_id, providerIds),
    with: {
      provider: true,
      institutionConnections: true,
    },
  });

  let synced = 0;
  let failed = 0;

  for (const provConn of providerConnections) {
    const providerName = provConn.provider?.name as ProviderName | undefined;
    if (!providerName) continue;

    for (const instConn of provConn.institutionConnections) {
      if (instConn.broken) continue;

      try {
        await syncConnectionData({
          providerName,
          userId: provConn.user_id,
          institutionConnectionId: instConn.id,
        });
        synced++;
      } catch (error) {
        failed++;
        console.error(
          `[sync-connection-data cron] Failed to sync ${providerName} connection ${instConn.id}:`,
          error,
        );
      }
    }
  }

  console.log("[sync-connection-data cron] complete", { synced, failed });
}
