import { drizzle } from "drizzle-orm/neon-serverless";

import { relations } from "../db/schema/relations";

export function createDb() {
  return drizzle(process.env.DATABASE_URL, { relations });
}

export type Database = ReturnType<typeof createDb>;
