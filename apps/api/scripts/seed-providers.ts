import { sql } from "drizzle-orm";

import { provider } from "../src/db/schema/providers";
import { createDb } from "../src/lib/db";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

const providers = [
  {
    id: 1,
    name: "SnapTrade",
    logo_url: `${BACKEND_URL}/static/provider_logo/snaptrade.svg`,
  },
  {
    id: 2,
    name: "EnableBanking",
    logo_url: `${BACKEND_URL}/static/provider_logo/enablebanking.svg`,
  },
  {
    id: 3,
    name: "Teller",
    logo_url: `${BACKEND_URL}/static/provider_logo/teller.svg`,
  },
];

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
