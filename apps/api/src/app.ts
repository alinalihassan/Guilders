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
  .onError(({ code, error, set }) => {
    console.error(`API Error [${code}]:`, error);
    set.status = 500;
    return { error: error instanceof Error ? error.message : "Internal server error" };
  })
  .compile();

export type App = typeof app;
export default app;
