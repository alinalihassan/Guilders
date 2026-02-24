import { drizzle } from "drizzle-orm/neon-http";

import { relations } from "../db/schema/relations";

export const db = drizzle(process.env.DATABASE_URL, { relations });
