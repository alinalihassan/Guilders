import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";

import { api } from "./routes";
import { oauthPagesRoutes } from "./routes/oauth-pages";
import { oauthWellKnownRoutes } from "./routes/oauth-well-known";

export const app = new Elysia({ adapter: CloudflareAdapter })
  .use(
    cors({
      credentials: true,
      origin: [
        // Guilders local development
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
      ],
    }),
  )
  .use(
    openapi({
      documentation: {
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
