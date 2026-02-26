# Guilders Docs App

This is a standalone Fumadocs + Next.js app for Guilders documentation.

## Environment

Copy `.env.example` and configure:

```bash
API_URL=http://localhost:3000
# optional
# OPENAPI_JSON_URL=http://localhost:3000/openapi/json
```

The OpenAPI integration reads schema from:

- `$OPENAPI_JSON_URL` (if provided), otherwise
- `$API_URL/openapi/json`

## Development

```bash
bun install
bun run dev --filter docs
```

App runs on `http://localhost:3003`.

## Key Paths

- `content/docs`: Written docs pages.
- `lib/openapi.ts`: OpenAPI source setup.
- `lib/source.ts`: Combined docs + OpenAPI source loader.
- `app/[[...slug]]/page.tsx`: Docs/OpenAPI page renderer.
