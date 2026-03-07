import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";

import packageJson from "../../../package.json";
import { env } from "./env";
import { api } from "./routes";
import { oauthPagesRoutes } from "./routes/oauth-pages";
import { oauthWellKnownRoutes } from "./routes/oauth-well-known";

export const app = new Elysia({ adapter: CloudflareAdapter })
  .use(env())
  .use(
    cors({
      credentials: true,
      origin: [process.env.BACKEND_URL, process.env.DASHBOARD_URL],
    }),
  )
  .use(
    openapi({
      documentation: {
        info: {
          title: "Guilders API Reference",
          version: packageJson.version,
        },
        components: {
          securitySchemes: {
            apiKeyAuth: {
              type: "apiKey",
              in: "header",
              name: "x-api-key",
            },
            bearerAuth: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "JWT",
            },
          },
        },
      },
    }),
  )
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
