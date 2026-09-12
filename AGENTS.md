# Guilders — Agent Guide

## Overview

Guilders is an open-source, self-hostable personal finance platform. It aggregates manual and synced financial accounts into a single dashboard, offers an AI financial advisor, and exposes a developer-friendly API with MCP support so external tools and AI agents can read and write financial data on the user's behalf.

**Live instances:**

| Service   | URL                            |
| --------- | ------------------------------ |
| API       | https://api.guilders.app       |
| Dashboard | https://dashboard.guilders.app |
| Website   | https://guilders.app           |
| Docs      | https://docs.guilders.app      |

## Monorepo Structure

```
guilders-elysia/
├── apps/
│   ├── api/           Elysia API on Cloudflare Workers
│   ├── dashboard/     TanStack Start + Vite web dashboard
│   ├── docs/          Fumadocs documentation site
│   ├── website/       Astro marketing site
│   └── mobile/        Expo / React Native mobile app (ignore unless asked)
├── packages/
│   ├── transactional/ React Email templates
│   └── tsconfig/      Shared TypeScript configs
```

**Package manager:** Bun 1.3.9
**Linting:** oxlint
**Formatting:** oxfmt

## Tech Stack

| Layer         | Technology                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------- |
| API Framework | Elysia 1.4 (Bun runtime, Cloudflare Workers adapter)                                        |
| Database      | PostgreSQL (Neon serverless) via Drizzle ORM                                                |
| Auth          | Better Auth (session cookies, bearer, passkeys, API keys, OAuth) + dash plugin              |
| AI            | Vercel AI SDK via Workers AI binding (`env.AI`) and AI Gateway id `guilders-ai-gateway`     |
| MCP           | `@modelcontextprotocol/sdk` — OAuth-authenticated                                           |
| Dashboard     | TanStack Start + Vite, React 19, Tailwind CSS, shadcn/ui, Recharts, Zustand, TanStack Query |
| Mobile        | Expo 55, React Native 0.83, Expo Router                                                     |
| Docs          | Fumadocs 16 (Next.js), OpenAPI integration                                                  |
| Email         | Cloudflare Email Sending + React Email                                                      |
| Payments      | Stripe (via Better Auth Stripe plugin)                                                      |
| Storage       | Cloudflare R2 (public + per-user buckets)                                                   |
| Providers     | SaltEdge (open banking), SnapTrade (brokerages)                                             |

## Data Model

### Core Entities

**Accounts** are the central entity. Each account belongs to a user and has a type, subtype, value, and currency.

- **Types:** `asset`, `liability`
- **Subtypes:** `depository`, `brokerage`, `crypto`, `property`, `vehicle`, `creditcard`, `loan`, `stock`
- **Manual accounts** have no `institution_connection_id`; **synced accounts** are linked to one.

**Transactions** belong to accounts. They carry an amount, currency, date, description, and optional category.

**Categories** are user-scoped and hierarchical (via `parent_id`). Each has a name, color, icon, and classification (`expense` / `income`).

### Provider / Institution Hierarchy

```
Provider  (e.g. SaltEdge, SnapTrade)
  └─ Institution  (e.g. Revolut, Fidelity)
       └─ Provider Connection  (user ↔ provider auth)
            └─ Institution Connection  (connection to a specific bank)
                 └─ Accounts  →  Transactions
```

### Database Schema

Schema files live in `apps/api/src/db/schema/`:

| File              | Tables                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| `auth.ts`         | user (incl. `lastActiveAt` for dash), session, user_account, apikey, twoFactor, passkey, OAuth, subscription |
| `accounts.ts`     | account                                                                                                      |
| `transactions.ts` | transaction                                                                                                  |
| `categories.ts`   | category                                                                                                     |
| `providers.ts`    | provider, institution, provider_connection, institution_connection                                           |
| `currencies.ts`   | currency, rate                                                                                               |
| `countries.ts`    | country                                                                                                      |
| `documents.ts`    | documents                                                                                                    |
| `webhooks.ts`     | webhook                                                                                                      |
| `relations.ts`    | Drizzle relation definitions                                                                                 |

### Database, Docker, and migrations

Local Postgres is `docker-compose.yml` at the repo root (`postgres:17-alpine`, `guilders` / `postgres` / `postgres`, port 5432).

```bash
bun run db:up          # docker compose up -d
bun run db:migrate     # apply Drizzle CLI migrations
bun run db:init        # seed currencies, countries, providers, institutions, rates
bun run db:studio      # drizzle-kit studio
bun run db:reset       # wipe the volume, migrate, re-seed
bun run db:down        # docker compose down (data kept)
bun run auth:generate  # regenerate Better Auth tables in src/db/schema/auth.ts
bun run db:generate    # create a new migration from schema changes
```

These are also defined on `@guilders/api` (`apps/api/package.json`).

**Never write or edit SQL migrations by hand.** The only allowed path is the Drizzle CLI:

1. Change schema in `apps/api/src/db/schema/` (or run `bun run auth:generate` after Better Auth plugin/config changes).
2. Review `auth.ts` after `auth:generate` — restore app-specific columns (`currency`, `timeFormat`, `stripeCustomerId`) and the `subscription` table if the CLI dropped them (it skips Stripe when Stripe env vars are unset).
3. `bun run db:generate` — drizzle-kit writes `apps/api/drizzle/<timestamp>_<name>/migration.sql`.
4. `bun run db:migrate` to apply.

Do not add files under `apps/api/drizzle/` yourself. Do not paste SQL into new migration folders. If a generate step is wrong, fix the TypeScript schema and generate again.

Production database is Neon (`DATABASE_URL`). Auth is Better Auth with the Drizzle adapter — there is no Supabase client, RLS, or `packages/database`.

## API Endpoints

All routes live under `/api` (see `apps/api/src/routes/`).

### Financial Data

| Method   | Path                           | Purpose                       |
| -------- | ------------------------------ | ----------------------------- |
| `GET`    | `/api/account`                 | List all user accounts        |
| `POST`   | `/api/account`                 | Create manual account         |
| `GET`    | `/api/account/:id`             | Get account by ID             |
| `PUT`    | `/api/account/:id`             | Update account                |
| `DELETE` | `/api/account/:id`             | Delete account                |
| `GET`    | `/api/transaction`             | List transactions (date desc) |
| `POST`   | `/api/transaction`             | Create transaction            |
| `GET`    | `/api/account/:id/transaction` | Transactions for one account  |
| `GET`    | `/api/category`                | List categories               |
| `POST`   | `/api/category`                | Create category               |

### Connections & Providers

| Method | Path                          | Purpose                      |
| ------ | ----------------------------- | ---------------------------- |
| `GET`  | `/api/provider`               | List providers               |
| `GET`  | `/api/institution`            | List institutions            |
| `GET`  | `/api/provider-connection`    | List provider connections    |
| `GET`  | `/api/institution-connection` | List institution connections |
| `*`    | `/api/connections`            | Connection management        |

### Other

| Path            | Purpose                                   |
| --------------- | ----------------------------------------- |
| `/api/auth/*`   | Better Auth handlers                      |
| `/api/chat`     | AI financial advisor (streaming)          |
| `/api/currency` | Currency list                             |
| `/api/rate`     | Exchange rates                            |
| `/api/country`  | Country list                              |
| `/mcp`          | MCP server endpoint (OAuth-authenticated) |
| `/callback/*`   | Provider OAuth callbacks                  |
| `/oauth/*`      | OAuth consent / sign-in pages             |

### OpenAPI

The API self-documents via `@elysiajs/openapi`. Auth uses either:

- `x-api-key` header (API key)
- `Authorization: Bearer <token>` (JWT)
- Session cookie (web)

## Authentication

Handled by Better Auth (`apps/api/src/lib/auth.tsx`).

**Supported methods:** email/password, passkeys (WebAuthn), API keys, two-factor authentication, OAuth.

**Plugins:** `@better-auth/infra` `dash()` (hosted admin dashboard + activity tracking), `@better-auth/passkey`, `@better-auth/stripe`, `@better-auth/expo`, `@better-auth/oauth-provider`.

The dashboard auth client (`apps/dashboard/src/lib/auth-client.ts`) includes `dashClient()` from `@better-auth/infra/client`. Set `BETTER_AUTH_API_KEY` to connect `dash()` to Better Auth Infrastructure.

The auth middleware at `apps/api/src/middleware/auth.ts` is an Elysia plugin that protects routes.

## AI Features

- **Chat endpoint** (`apps/api/src/routes/chat/`): streams responses via Vercel AI SDK through the Workers `AI` binding (`gateway: { id: "guilders-ai-gateway" }`). No AI Gateway token.
- **Financial context** (`apps/api/src/routes/chat/utils.ts`): injects accounts, transactions, and categories into the system prompt.
- **Dashboard advisor** (sidebar in the TanStack Start protected layout): React chat UI via `@ai-sdk/react` in `apps/dashboard/src/components/advisor/`.
- **Mobile chat** (`apps/mobile/src/app/(app)/chat/`): streaming chat with markdown rendering.

## MCP Server

Endpoint: `/mcp` (OAuth-authenticated via Better Auth as OAuth provider).

**Tools:**

| Tool               | Description                                                      |
| ------------------ | ---------------------------------------------------------------- |
| `get_accounts`     | Returns user accounts (limit 1–100, default 50)                  |
| `get_transactions` | Returns user transactions (optional account filter, limit 1–100) |

Implementation: `apps/api/src/mcp/`

## Provider Integrations

Providers implement the `IProvider` interface (`apps/api/src/providers/types.ts`):

```
getInstitutions, registerUser, deregisterUser,
connect, reconnect, refreshConnection,
getAccounts, getTransactions
```

**Current providers:** SaltEdge (`apps/api/src/providers/saltedge/`), SnapTrade (`apps/api/src/providers/snaptrade/`).

The provider interface is designed so developers can add their own integrations — build a custom bank scraper, crypto exchange connector, or anything else that implements `IProvider`, and push data into Guilders via the API.

## Background Jobs

| Schedule | Job                    | Location                                |
| -------- | ---------------------- | --------------------------------------- |
| Hourly   | Sync exchange rates    | `apps/api/src/cron/`                    |
| Daily    | Sync institution data  | `apps/api/src/cron/`                    |
| Queue    | Process webhook events | `apps/api/src/queues/webhook-events.ts` |

Queue: `guilders-webhook-events` (Cloudflare Queues, max batch 10, 5 retries, DLQ).

## Implementation Notes for Agents

0. **Ignore `apps/mobile`** unless the user explicitly asks to work on it (env, features, bugs, deploys). Do not update mobile clients, Expo env, or mobile docs as part of API/dashboard work.
1. **Accounts are the primary entity** — fetch accounts for the home view, not institution connections.
2. **Transactions belong to accounts** — always show which account a transaction belongs to.
3. **Synced vs manual** — check `institution_connection_id` to determine if an account is synced.
4. **Use the Better Auth client** for all requests; it handles authentication automatically.
5. **Currency handling** — accounts have their own currency; consider conversion for net-worth totals.
6. **Eden treaty** — the dashboard uses `@elysiajs/eden` for end-to-end type-safe API calls.
7. **React 19 compiler** — the dashboard uses `babel-plugin-react-compiler`; avoid manual `useMemo`/`useCallback` where the compiler handles it.
8. **Formatting** — ALWAYS run `bun format` after making any code changes to ensure the codebase remains consistently formatted.
9. **Schema changes** — only via Drizzle CLI (`bun run db:generate`). Never hand-write migration SQL. After Better Auth plugin changes, run `bun run auth:generate` first, then `db:generate`.

### Local verification (agents)

Local services: website `http://localhost:3001`, API `http://localhost:3000`, dashboard `http://localhost:3002`, docs `http://localhost:3003`. Start Postgres with `bun run db:up`, then `bun run db:migrate && bun run db:init`.

**Database.** Prefer `bun run db:query -- "SELECT id, email FROM \"user\" LIMIT 10"` (runs `psql` in `guilders-postgres`). `bun run db:studio` opens Drizzle Studio. Do not guess connection strings — local is `postgresql://postgres:postgres@localhost:5433/guilders` (host 5433 so it does not collide with other local Postgres).

**Email and magic links.** Leave the `EMAIL` binding local (no `remote: true`). No mailbox setup. Wrangler logs `[wrangler:info] send_email` and writes HTML/text under `apps/api/.wrangler/tmp/email/` — open that file and use the reset/verify URL. Production: Gmail MCP.

**Wrangler.** `apps/api` `bun run dev` needs Wrangler 4.131+. The `AI` binding must stay `"remote": true` (Workers AI has no local simulator). 4.71 fails to create that preview session.

**Known local user.** After the API is up: `bun run agent:user` creates `agent@guilders.test` / `agent-agent-agent`. Sign-up does not require email verification.

### Common Patterns

**Fetch dashboard data:**

```typescript
const accounts = await fetch("/api/account").then((r) => r.json());
const totalValue = accounts.reduce(
  (sum, a) => sum + (a.type === "liability" ? -1 : 1) * Number(a.value),
  0,
);
const transactions = await fetch("/api/transaction?limit=20").then((r) => r.json());
```

**Create manual account:**

```typescript
POST /api/account
{
  "name": "Emergency Cash",
  "type": "asset",
  "subtype": "depository",
  "value": "5000",
  "currency": "USD"
}
```

**Create manual transaction:**

```typescript
POST /api/transaction
{
  "account_id": 123,
  "amount": "-150.00",
  "currency": "USD",
  "timestamp": "2026-02-19T00:00:00.000Z",
  "description": "Grocery shopping",
  "category_id": 1
}
```

## Environment Variables

- **Backend / scripts:** Use `process.env` for environment variables (API, db scripts, CLI scripts). This avoids having to determine whether code is used indirectly by scripts (e.g. db code used by `drizzle.config.ts` or migrations).
- **Frontend:** For dashboard (and other frontend) code that needs env vars, **t3 env is preferred** (`@t3-oss/env-nextjs` or equivalent t3 env setup). You can use `process.env` as well, but t3 env gives validated, typed access and makes which variables are exposed to the client explicit.

**API:** One local file: `apps/api/.env` (see `.env.example`). Wrangler 4 loads `.env` into the Worker during `wrangler dev`. Bun scripts use `--env-file=.env`. **Do not create `.dev.vars`** — if it exists, Wrangler ignores `.env`. Production secrets live in Cloudflare. Prefer `wrangler secret put` for one-off keys. **`wrangler secret bulk` deploys the Worker from the current working tree** — never run it from `dev` or a dirty checkout against production. Types in `apps/api/worker-configuration.d.ts`.

| Group             | Variables                                                                                                                                |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Database**      | `DATABASE_URL` (PostgreSQL connection string)                                                                                            |
| **URLs**          | `BACKEND_URL`, `DASHBOARD_URL`                                                                                                           |
| **Secrets**       | `GUILDERS_SECRET` (provider state verification), `BETTER_AUTH_SECRET`, `BETTER_AUTH_API_KEY` (optional, Better Auth Infrastructure dash) |
| **Payments**      | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`                                                                                             |
| **Email**         | None (Workers `EMAIL` binding — Cloudflare Email Sending). From: `noreply@guilders.app`                                                  |
| **Cloudflare**    | None in the Worker. `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` are GitHub Actions secrets for deploy. R2 is `USER_BUCKET`.         |
| **Bindings**      | `AI` (Workers AI), `EMAIL` (send_email), `USER_BUCKET` (R2), `WEBHOOK_QUEUE` (Queue)                                                     |
| **Dev tunnels**   | `NGROK_TOKEN`, `NGROK_URL` (optional, for provider callbacks)                                                                            |
| **SnapTrade**     | `SNAPTRADE_CLIENT_ID`, `SNAPTRADE_CLIENT_SECRET`                                                                                         |
| **SaltEdge**      | `SALTEDGE_APP_ID`, `SALTEDGE_SECRET`                                                                                                     |
| **EnableBanking** | `ENABLEBANKING_CLIENT_ID`, `ENABLEBANKING_CLIENT_PRIVATE_KEY`                                                                            |
| **Teller**        | `TELLER_APPLICATION_ID`, `TELLER_PRIVATE_KEY`, `TELLER_ENVIRONMENT`, `TELLER_WEBHOOK_SECRET`                                             |
