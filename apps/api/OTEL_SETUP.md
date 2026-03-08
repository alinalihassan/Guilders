# OpenTelemetry Setup for Guilders API

This document describes the OpenTelemetry instrumentation configured for the Guilders API, including tracing for Better Auth, Drizzle ORM, Resend, and Cloudflare Workers.

## Overview

The API is instrumented with the following Kubiks OpenTelemetry packages:
- **@kubiks/otel-better-auth**: Traces authentication flows, logins, signups, and session management
- **@kubiks/otel-drizzle**: Traces all database queries and operations
- **@kubiks/otel-resend**: Traces email sending operations
- **@elysiajs/opentelemetry**: Middleware for HTTP request tracing in Elysia
- **Cloudflare Workers integration**: Captures regional, cache, and performance data

## Configuration

### Environment Variables

Copy `.env.otel` to your `.env.local` or deployment configuration and update with your Kubiks API key:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=https://ingest.kubiks.app
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_EXPORTER_OTLP_HEADERS=x-kubiks-key=YOUR_API_KEY
OTEL_SERVICE_NAME=guilders-api
```

Get your API key from the Kubiks dashboard: https://app.kubiks.app/settings

### For Cloudflare Workers / Wrangler

Add these secrets to your `wrangler.toml` or deploy them via CLI:

```bash
wrangler secret put OTEL_EXPORTER_OTLP_ENDPOINT
wrangler secret put OTEL_EXPORTER_OTLP_HEADERS
```

Then reference them in your environment configuration.

## Instrumentation Files

### `src/instrumentation.ts`
- Initializes the OpenTelemetry SDK
- Configures OTLP exporter for Kubiks
- Registers Better Auth, Drizzle, and Resend instrumentations
- Enables Node.js auto-instrumentations

### `src/app.ts`
- Adds `@elysiajs/opentelemetry` middleware to all routes
- Configures span processors for batch exporting
- Sets up service name and auto resource detection

### `src/cloudflare-telemetry.ts`
- Helper functions to extract Cloudflare-specific data
- Captures region, country, colo, cache status
- Can be used to enrich spans with edge location data

## Traced Operations

### Better Auth
Automatically traces:
- Email signin/signup (`auth.http.signin.email`, `auth.http.signup.email`)
- OAuth flows (`auth.http.oauth.callback.{provider}`)
- Session management (`auth.api.get_session`, `auth.api.list_sessions`)
- Account operations (`auth.api.update_user`, `auth.api.delete_user`)
- Password reset flows

**Key Attributes:**
- `auth.operation`: Type of auth operation
- `auth.success`: Whether operation succeeded
- `user.id`: User ID when available
- `user.email`: User email
- `auth.provider`: OAuth provider (google, github, etc.)

### Drizzle ORM
Automatically traces all database operations:
- SELECT queries (`drizzle.select`)
- INSERT operations (`drizzle.insert`)
- UPDATE operations (`drizzle.update`)
- DELETE operations (`drizzle.delete`)
- Transactions (`drizzle.transaction`)

**Key Attributes:**
- `db.operation`: SQL operation type
- `db.statement`: Full SQL query (configurable)
- `db.system`: postgresql
- `db.name`: Database name
- `db.mongodb.collection`: Table name
- `net.peer.name`: Database host
- `net.peer.port`: Database port

### Resend
Automatically traces email operations:
- Email sending (`resend.emails.send`)

**Key Attributes:**
- `messaging.system`: resend
- `resend.to_addresses`: Recipient addresses
- `resend.from`: Sender address
- `resend.subject`: Email subject
- `resend.message_id`: Resend message ID
- `resend.template_id`: Template ID if using templates

### HTTP Requests (Elysia)
Automatically traces:
- All incoming HTTP requests
- Route matching and processing
- Response status codes
- Request duration

**Key Attributes:**
- `http.request.method`: HTTP method
- `http.url`: Request URL
- `http.status_code`: Response status
- `http.route`: Matched route pattern

### Cloudflare Workers
When running on Cloudflare Workers, the following data can be captured:
- `cf.country`: Client country code
- `cf.region`: Client region
- `cf.colo`: Cloudflare colo (edge location)
- `cf.cache_status`: Cache HIT/MISS/BYPASS
- `cf.request_id`: CF-Ray request ID

## Usage Examples

### Manual Span Creation with Cloudflare Data

```typescript
import { trace, context } from "@opentelemetry/api";
import { extractCloudflareData, CLOUDFLARE_SPAN_ATTRIBUTES } from "./cloudflare-telemetry";

export async function myHandler(request: Request) {
  const tracer = trace.getTracer("my-service");
  
  const span = tracer.startSpan("my-operation");
  
  // Add Cloudflare data to span
  const cfData = extractCloudflareData(request);
  span.setAttributes({
    [CLOUDFLARE_SPAN_ATTRIBUTES.COUNTRY]: cfData.country,
    [CLOUDFLARE_SPAN_ATTRIBUTES.COLO]: cfData.colo,
    [CLOUDFLARE_SPAN_ATTRIBUTES.CACHE_STATUS]: cfData.cacheStatus,
  });
  
  // Your operation here
  
  span.end();
}
```

### Checking Drizzle Queries in Logs

All database queries are automatically traced. In Kubiks dashboard, filter by:
- Span name: `drizzle.select`, `drizzle.insert`, etc.
- Attribute: `db.system = 'postgresql'`

### Checking Authentication Flows

Filter in Kubiks by:
- Span name: `auth.http.signin.email`, `auth.http.signup.email`, etc.
- Attribute: `auth.success = true` or `auth.success = false`

## Performance Considerations

### Sampling
For high-traffic production environments, adjust sampling:

```bash
# Sample 10% of traces
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1
```

### Batch Processing
The instrumentation uses batch span processors which are configured with:
- Max queue size: 2048 spans
- Scheduled delay: 5 seconds
- Max batch size: 512 spans

Adjust these in `.env.otel` if needed.

### Query Text Capture
By default, full SQL query text is captured. For sensitive data:

```bash
# Disable query text capture
OTEL_INSTRUMENTATION_DRIZZLE_CAPTURE_QUERY_TEXT=false

# Or limit query length
OTEL_INSTRUMENTATION_DRIZZLE_MAX_QUERY_LENGTH=100
```

## Troubleshooting

### No Data Appearing in Kubiks
1. Verify API key is correct in `OTEL_EXPORTER_OTLP_HEADERS`
2. Check that `OTEL_EXPORTER_OTLP_ENDPOINT` is set to `https://ingest.kubiks.app`
3. Ensure environment variables are loaded (not just in `.env.otel`)
4. Check browser console for any errors from the instrumentation

### High Memory Usage
- Reduce `OTEL_BSP_MAX_QUEUE_SIZE` if queue is building up
- Increase `OTEL_TRACES_SAMPLER_ARG` to reduce sampling rate
- Check if exporter is successfully sending data (network issues)

### Missing Attributes
- Ensure instrumentations are imported and registered in `src/instrumentation.ts`
- Check that `initializeOpenTelemetry()` is called in `src/app.ts`
- Verify configuration flags like `OTEL_INSTRUMENTATION_DRIZZLE_CAPTURE_QUERY_TEXT`

## Next Steps

1. Deploy with environment variables configured
2. View traces in Kubiks dashboard: https://app.kubiks.app/traces
3. Set up alerts for error traces
4. Configure Slack integration for notifications
5. Use trace data to identify slow operations and optimize

## Resources

- [Kubiks Documentation](https://docs.kubiks.ai)
- [OpenTelemetry JS Documentation](https://opentelemetry.io/docs/instrumentation/js/)
- [Better Auth Documentation](https://www.better-auth.com)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [Resend Documentation](https://resend.com/docs)
