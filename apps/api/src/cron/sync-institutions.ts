import { sql } from "drizzle-orm";
import { institution } from "../db/schema/institutions";
import { db } from "../lib/db";
import type { IProvider } from "../providers/types";

function getProviderAdapters(): IProvider[] {
  return [];
}

export async function syncInstitutions() {
  const providers = await db.query.provider.findMany();
  const adapters = getProviderAdapters();

  for (const adapter of adapters) {
    try {
      const providerRecord = providers.find((p) => p.name === adapter.name);
      if (!providerRecord) {
        console.error(
          `Provider "${adapter.name}" not found in database, skipping`,
        );
        continue;
      }

      const institutions = await adapter.getInstitutions();
      if (!institutions.length) {
        console.log(`No institutions returned for ${adapter.name}`);
        continue;
      }

      const BATCH_SIZE = 500;
      for (let i = 0; i < institutions.length; i += BATCH_SIZE) {
        const batch = institutions.slice(i, i + BATCH_SIZE);
        const rows = batch.map((inst) => ({
          ...inst,
          provider_id: providerRecord.id,
        }));

        await db
          .insert(institution)
          .values(rows)
          .onConflictDoUpdate({
            target: [
              institution.provider_id,
              institution.provider_institution_id,
            ],
            set: {
              name: sql`excluded.name`,
              logo_url: sql`excluded.logo_url`,
              enabled: sql`excluded.enabled`,
              country: sql`excluded.country`,
            },
          });
      }

      console.log(
        `Synced ${institutions.length} institutions for ${adapter.name}`,
      );
    } catch (error) {
      console.error(
        `Failed to sync institutions for ${adapter.name}:`,
        error,
      );
    }
  }
}
