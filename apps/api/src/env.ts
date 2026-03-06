import { Elysia } from "elysia";
import { z } from "zod";

const EnvSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // URLs
  BACKEND_URL: z.string().url(),
  DASHBOARD_URL: z.string().url(),

  // Auth & secrets
  BETTER_AUTH_SECRET: z.string(),

  // Email (Resend)
  RESEND_API_KEY: z.string(),

  // Cloudflare
  CLOUDFLARE_ACCOUNT_ID: z.string(),
  CLOUDFLARE_AI_GATEWAY: z.string(),
  CLOUDFLARE_AI_GATEWAY_TOKEN: z.string(),
  CLOUDFLARE_R2_ACCESS_KEY: z.string(),
  CLOUDFLARE_R2_SECRET_KEY: z.string(),

  // Stripe
  STRIPE_PRO_PRICE_ID: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

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

function getEnvSource(): Record<string, string | undefined> {
  return typeof process !== "undefined" && process.env ? process.env : {};
}

/**
 * Elysia plugin that validates environment variables at startup.
 * All variables are optional; when present, they are validated (e.g. URLs must be valid).
 * Use: app.use(env())
 */
export function env() {
  const source = getEnvSource();
  const result = EnvSchema.safeParse(source);

  if (!result.success) {
    const issues = result.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Environment validation failed:\n${issues}`);
  }

  return new Elysia({ name: "env" })
    .state("envConfig", result.data as EnvConfig)
    .derive(() => ({ envConfig: result.data as EnvConfig }));
}
