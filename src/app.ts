import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";
import { OpenAPI } from "./lib/auth-openapi";
import { api } from "./routes";

export const app = new Elysia({ adapter: CloudflareAdapter })
  .use(
    openapi({
      documentation: {
        components: {
          ...await OpenAPI.components,
          securitySchemes: {
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
  .compile();

export type App = typeof app;
export default app;
