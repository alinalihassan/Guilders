import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";

import { OpenAPI } from "./lib/auth-openapi";
import { api } from "./routes";

export const app = new Elysia({ adapter: CloudflareAdapter })
  .use(
    cors({
      credentials: true,
      origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
    }),
  )
  .use(
    openapi({
      documentation: {
        components: {
          ...(await OpenAPI.components),
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
        paths: await OpenAPI.getPaths(),
      },
    }),
  )
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
