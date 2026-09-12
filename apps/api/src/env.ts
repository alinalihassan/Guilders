import { z } from "zod";

const EnvSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // URLs
  BACKEND_URL: z.string().url(),
  DASHBOARD_URL: z.string().url(),

  // Auth & secrets
  BETTER_AUTH_SECRET: z.string(),
  BETTER_AUTH_API_KEY: z.string().optional(),

  // Stripe
  STRIPE_PRO_PRICE_ID: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  PRO_FEATURES_FREE_FOR_ALL: z.string().optional(),

  // Providers
  GUILDERS_SECRET: z.string().optional(),

  // Ngrok / tunnels
  NGROK_TOKEN: z.string().optional(),
  NGROK_URL: z.string().url().optional(),

  // SnapTrade
  SNAPTRADE_CLIENT_ID: z.string().optional(),
  SNAPTRADE_CLIENT_SECRET: z.string().optional(),

  // SaltEdge
  SALTEDGE_APP_ID: z.string().optional(),
  SALTEDGE_SECRET: z.string().optional(),

  // EnableBanking
  ENABLEBANKING_CLIENT_ID: z.string().optional(),
  ENABLEBANKING_CLIENT_PRIVATE_KEY: z.string().optional(),

  // Teller
  TELLER_APPLICATION_ID: z.string().optional(),
  TELLER_PRIVATE_KEY: z.string().optional(),
  TELLER_ENVIRONMENT: z.string().optional(),
  TELLER_WEBHOOK_SECRET: z.string().optional(),

  // Runtime / test
  NODE_ENV: z.enum(["development", "production", "test"]).optional(),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

/** Wrangler and bun both load apps/api/.env. Empty optional keys are treated as unset. */
function envWithEmptyAsUnset(source: NodeJS.ProcessEnv): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [key, value === "" ? undefined : value]),
  );
}

/** Validate environment variables at startup. Skipped under Vitest. */
export function validateEnv() {
  if (process.env.VITEST === "true") {
    return;
  }

  const result = EnvSchema.safeParse(envWithEmptyAsUnset(process.env));

  if (!result.success) {
    const issues = result.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Environment validation failed:\n${issues}`);
  }
}
