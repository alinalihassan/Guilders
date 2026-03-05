import { drizzle } from "drizzle-orm/node-postgres";

import { relations } from "../db/schema/relations";

/** Builds the node-postgres Drizzle instance (used only for typing). */
function nodeDbWithRelations() {
  return drizzle(process.env.DATABASE_URL!, { relations });
}

/** Type of a Drizzle instance with our relations (so db.query.* is typed). */
export type Database = ReturnType<typeof nodeDbWithRelations>;

let pgliteDb: Database | null = null;

/**
 * Initialize PGLite in-memory Postgres for testing.
 * Must be called (and awaited) from a Vitest setup file before any tests run.
 */
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
    if (!pgliteDb) {
      throw new Error("PGLite not initialized — call initPgliteDb() in test setup first");
    }
    return pgliteDb;
  }
  return drizzle(process.env.DATABASE_URL, { relations });
}
