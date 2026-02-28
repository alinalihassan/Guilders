import { sql } from "drizzle-orm";

import { provider } from "../src/db/schema/providers";
import { createDb } from "../src/lib/db";

const providers = [
  {
    id: 1,
    name: "SnapTrade",
    logo_url: "https://bucket.guilders.app/provider_logo/snaptrade_logo.svg",
  },
] as const;

export async function seedProviders() {
  const db = createDb();

  await db
    .insert(provider)
    .values([...providers])
    .onConflictDoUpdate({
      target: provider.id,
      set: {
        name: sql`excluded.name`,
        logo_url: sql`excluded.logo_url`,
      },
    });

  console.log(`Seeded ${providers.length} providers`);
}
