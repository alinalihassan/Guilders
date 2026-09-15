declare module "cloudflare:workers" {
  export const env: Env;
  export function waitUntil(promise: Promise<unknown>): void;
  export class DurableObject {
    ctx: unknown;
    env: Env;
    constructor(ctx: unknown, env: Env);
  }
}

interface Env {
  DATABASE_URL: string;
  BACKEND_URL: string;
  DASHBOARD_URL: string;
  GUILDERS_SECRET: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_API_KEY: string;
  STRIPE_PRO_PRICE_ID: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  DEV_TUNNEL_URL: string;
  SNAPTRADE_CLIENT_ID: string;
  SNAPTRADE_CLIENT_SECRET: string;
  ENABLEBANKING_CLIENT_ID: string;
  ENABLEBANKING_CLIENT_PRIVATE_KEY: string;
  TELLER_APPLICATION_ID: string;
  TELLER_PRIVATE_KEY: string;
  TELLER_ENVIRONMENT: string;
  TELLER_WEBHOOK_SECRET: string;
  // Bindings — typed loosely so App route types resolve without Workers runtime
  AI: any;
  USER_BUCKET: any;
  EMAIL: any;
  WEBHOOK_QUEUE: any;
  RATE_LIMIT: any;
  CHAT_RATE_LIMITER: any;
}
