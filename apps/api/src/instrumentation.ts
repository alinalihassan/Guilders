import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";

import { BetterAuthInstrumentation } from "@kubiks/otel-better-auth";
import { DrizzleInstrumentation } from "@kubiks/otel-drizzle";
import { ResendInstrumentation } from "@kubiks/otel-resend";

/**
 * Initialize OpenTelemetry for Cloudflare Workers
 * This sets up tracing for Better Auth, Drizzle ORM, and Resend
 */
export function initializeOpenTelemetry() {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  const apiKey = process.env.OTEL_EXPORTER_OTLP_HEADERS;
  
  if (!endpoint || !apiKey) {
    console.warn("OpenTelemetry not configured. Skipping instrumentation setup.");
    return;
  }

  const exporter = new OTLPTraceExporter({
    url: `${endpoint}/v1/traces`,
    headers: {
      "x-kubiks-key": apiKey.replace("x-kubiks-key=", ""),
    },
  });

  const sdk = new NodeSDK({
    traceExporter: exporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-http": {
          enabled: true,
        },
      }),
      new BetterAuthInstrumentation(),
      new DrizzleInstrumentation(),
      new ResendInstrumentation(),
    ],
    serviceName: process.env.OTEL_SERVICE_NAME || "guilders-api",
    autoDetectResources: true,
  });

  sdk.start();
  
  console.log("✓ OpenTelemetry initialized with Better Auth, Drizzle, and Resend instrumentation");
}

// Call initialization when the module is imported
if (typeof globalThis !== "undefined") {
  initializeOpenTelemetry();
}
