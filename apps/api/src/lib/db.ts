import { drizzle } from "drizzle-orm/node-postgres";

import { relations } from "../db/schema/relations";

export function createDb() {
  return drizzle(process.env.DATABASE_URL, { relations });
}

export type Database = ReturnType<typeof createDb>;
