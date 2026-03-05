import { drizzle } from "drizzle-orm/node-postgres";

import { relations } from "../db/schema/relations";

function nodeDbWithRelations() {
  return drizzle(process.env.DATABASE_URL!, { relations });
}

export type Database = ReturnType<typeof nodeDbWithRelations>;

let pgliteDb: Database | null = null;

export async function initPgliteDb(): Promise<void> {
  if (pgliteDb) return;

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle: drizzlePglite } = await import("drizzle-orm/pglite");

  const client = new PGlite();

  const migrationsSql = process.env.MIGRATIONS_SQL;
  if (migrationsSql) {
    const statements = migrationsSql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const stmt of statements) {
      await client.exec(stmt);
    }
  }

  pgliteDb = drizzlePglite({ client, relations }) as unknown as Database;
}

export function createDb(): Database {
  if (process.env.USE_PGLITE === "1") {
    return pgliteDb!;
  }
  return drizzle(process.env.DATABASE_URL, { relations });
}
