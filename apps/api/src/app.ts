import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { opentelemetry } from "@elysiajs/opentelemetry";
import { Elysia } from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

import packageJson from "../../../package.json";
import { env } from "./env";
import { api } from "./routes";
import { oauthPagesRoutes } from "./routes/oauth-pages";
import { oauthWellKnownRoutes } from "./routes/oauth-well-known";
import { initializeOpenTelemetry } from "./instrumentation";

// Initialize instrumentation
initializeOpenTelemetry();

export const app = new Elysia({ adapter: CloudflareAdapter })
  .use(env())
  .use(
    opentelemetry({
      serviceName: process.env.OTEL_SERVICE_NAME || "guilders-api",
      spanProcessors: process.env.OTEL_EXPORTER_OTLP_ENDPOINT
        ? [
            new BatchSpanProcessor(
              new OTLPTraceExporter({
                url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
                headers: {
                  "x-kubiks-key": (process.env.OTEL_EXPORTER_OTLP_HEADERS || "").replace(
                    "x-kubiks-key=",
                    ""
                  ),
                },
              })
            ),
          ]
        : [],
    })
  )
  .use(
    cors({
      // Reflect request Origin so dashboard gets exact origin (required for cookies)
      // and API-key clients from any origin are not blocked
      origin: true,
      credentials: true,
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
