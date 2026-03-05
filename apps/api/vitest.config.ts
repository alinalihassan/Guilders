import fs from "node:fs";
import path from "node:path";

import { defineConfig } from "vitest/config";

function loadMigrationsSql(): string {
  const drizzleDir = path.join(__dirname, "drizzle");
  const migrationDirs = fs
    .readdirSync(drizzleDir)
    .filter((d) => fs.statSync(path.join(drizzleDir, d)).isDirectory())
    .toSorted();

  const sqls: string[] = [];
  for (const dir of migrationDirs) {
    const sqlPath = path.join(drizzleDir, dir, "migration.sql");
    if (fs.existsSync(sqlPath)) {
      sqls.push(fs.readFileSync(sqlPath, "utf-8"));
    }
  }

  return sqls.join("\n");
}

export default defineConfig({
  resolve: {
    alias: {
      "cloudflare:workers": path.resolve(__dirname, "test/__mocks__/cloudflare-workers.ts"),
      "cloudflare:test": path.resolve(__dirname, "test/__mocks__/cloudflare-test.ts"),
      "cloudflare:email": path.resolve(__dirname, "test/__mocks__/cloudflare-email.ts"),
      "cloudflare:sockets": path.resolve(__dirname, "test/__mocks__/cloudflare-sockets.ts"),
    },
  },
  test: {
    setupFiles: ["./test/setup.ts"],
    testTimeout: 30_000,
    poolOptions: {
      threads: { maxThreads: 8 },
    },
    server: {
      deps: {
        inline: ["agents", "partyserver", /cloudflare:/],
      },
    },
  },
  define: {
    "process.env.USE_PGLITE": JSON.stringify("1"),
    "process.env.MIGRATIONS_SQL": JSON.stringify(loadMigrationsSql()),
    "process.env.BACKEND_URL": JSON.stringify("http://localhost:8787"),
    "process.env.DASHBOARD_URL": JSON.stringify("http://localhost:3002"),
    "process.env.BETTER_AUTH_SECRET": JSON.stringify("test-secret-at-least-32-characters-long!!"),
    "process.env.GUILDERS_SECRET": JSON.stringify("test-guilders-secret"),
    "process.env.STRIPE_SECRET_KEY": JSON.stringify("FAKE_STRIPE_SECRET_PLACEHOLDER"),
    "process.env.STRIPE_PRO_PRICE_ID": JSON.stringify("FAKE_STRIPE_PRICE_ID_PLACEHOLDER"),
    "process.env.STRIPE_WEBHOOK_SECRET": JSON.stringify("FAKE_STRIPE_WEBHOOK_SECRET_PLACEHOLDER"),
    "process.env.RESEND_API_KEY": JSON.stringify("FAKE_RESEND_API_KEY_PLACEHOLDER"),
    "process.env.CLOUDFLARE_ACCOUNT_ID": JSON.stringify("test-account-id"),
    "process.env.CLOUDFLARE_AI_GATEWAY": JSON.stringify("test-gateway"),
    "process.env.CLOUDFLARE_AI_GATEWAY_TOKEN": JSON.stringify("test-gateway-token"),
    "process.env.CLOUDFLARE_R2_ACCESS_KEY": JSON.stringify("test-r2-access"),
    "process.env.CLOUDFLARE_R2_SECRET_KEY": JSON.stringify("test-r2-secret"),
    "process.env.NODE_ENV": JSON.stringify("development"),
  },
});
