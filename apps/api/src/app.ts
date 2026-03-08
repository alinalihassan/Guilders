import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";

import { env } from "./env";
import { getOpenAPI } from "./lib/openapi";
import { api } from "./routes";
import { oauthPagesRoutes } from "./routes/oauth-pages";
import { oauthWellKnownRoutes } from "./routes/oauth-well-known";

export const app = new Elysia({ adapter: CloudflareAdapter })
  .use(env())
  .use(
    cors({
      // Reflect request Origin so dashboard gets exact origin (required for cookies)
      // and API-key clients from any origin are not blocked
      origin: true,
      credentials: true,
    }),
  )
  .use(await getOpenAPI())
  .use(oauthPagesRoutes)
  .use(oauthWellKnownRoutes)
  .use(api)
  .onError(({ code, error, set }) => {
    console.error(`API Error [${code}]:`, error);
    set.status = 500;
    return {
      error: error instanceof Error ? error.message : "Internal server error",
    };
  })
  .compile();

export type App = typeof app;
export default app;
