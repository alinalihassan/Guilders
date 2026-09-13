import { defineConfig } from "drizzle-kit";

import { withVerifyFullSsl } from "./src/lib/database-url";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema/*.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ? withVerifyFullSsl(process.env.DATABASE_URL) : undefined,
  },
});
