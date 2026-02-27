# Guilders — Agent Guide

## Overview

Guilders is an open-source, self-hostable personal finance platform. It aggregates manual and synced financial accounts into a single dashboard, offers an AI financial advisor, and exposes a developer-friendly API with MCP support so external tools and AI agents can read and write financial data on the user's behalf.

**Live instances:**

| Service   | URL                          |
|-----------|------------------------------|
| API       | https://api.guilders.app     |
| Dashboard | https://dashboard.guilders.app |
| Website   | https://guilders.app         |
| Docs      | https://docs.guilders.app    |

## Monorepo Structure

```
guilders-elysia/
├── apps/
│   ├── api/           Elysia API on Cloudflare Workers
│   ├── dashboard/     Next.js 16 web dashboard
│   ├── docs/          Fumadocs documentation site
│   └── mobile/        Expo / React Native mobile app
├── packages/
│   ├── transactional/ React Email templates
│   └── tsconfig/      Shared TypeScript configs
```

**Package manager:** Bun 1.3.9
**Linting:** oxlint
**Formatting:** oxfmt

## Tech Stack

| Layer          | Technology                                           |
|----------------|------------------------------------------------------|
| API Framework  | Elysia 1.4 (Bun runtime, Cloudflare Workers adapter) |
| Database       | PostgreSQL (Neon serverless) via Drizzle ORM         |
| Auth           | Better Auth (session cookies, bearer tokens, passkeys, API keys, OAuth provider) |
| AI             | Vercel AI SDK → Google Gemini 2.5 Flash via Cloudflare AI Gateway |
| MCP            | `@modelcontextprotocol/sdk` — OAuth-authenticated    |
| Dashboard      | Next.js 16, React 19, Tailwind CSS, shadcn/ui, Recharts, Zustand, TanStack Query |
| Mobile         | Expo 55, React Native 0.83, Expo Router              |
| Docs           | Fumadocs 16 (Next.js), OpenAPI integration            |
| Email          | Resend + React Email                                 |
| Payments       | Stripe (via Better Auth Stripe plugin)               |
| Storage        | Cloudflare R2 (public + per-user buckets)            |
| Providers      | SaltEdge (open banking), SnapTrade (brokerages)      |

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

| File               | Tables                                                         |
|--------------------|----------------------------------------------------------------|
| `auth.ts`          | user, session, user_account, apikey, twoFactor, passkey, OAuth tables |
| `accounts.ts`      | account                                                        |
| `transactions.ts`  | transaction                                                    |
| `categories.ts`    | category                                                       |
| `providers.ts`     | provider, institution, provider_connection, institution_connection |
| `currencies.ts`    | currency, rate                                                 |
| `countries.ts`     | country                                                        |
| `documents.ts`     | documents                                                      |
| `relations.ts`     | Drizzle relation definitions                                   |

Migrations: `apps/api/drizzle/`

## API Endpoints

All routes live under `/api` (see `apps/api/src/routes/`).

### Financial Data

| Method   | Path                                  | Purpose                         |
|----------|---------------------------------------|---------------------------------|
| `GET`    | `/api/account`                        | List all user accounts          |
| `POST`   | `/api/account`                        | Create manual account           |
| `GET`    | `/api/account/:id`                    | Get account by ID               |
| `PUT`    | `/api/account/:id`                    | Update account                  |
| `DELETE` | `/api/account/:id`                    | Delete account                  |
| `GET`    | `/api/transaction`                    | List transactions (date desc)   |
| `POST`   | `/api/transaction`                    | Create transaction              |
| `GET`    | `/api/account/:id/transaction`        | Transactions for one account    |
| `GET`    | `/api/category`                       | List categories                 |
| `POST`   | `/api/category`                       | Create category                 |

### Connections & Providers

| Method   | Path                                  | Purpose                         |
|----------|---------------------------------------|---------------------------------|
| `GET`    | `/api/provider`                       | List providers                  |
| `GET`    | `/api/institution`                    | List institutions               |
| `GET`    | `/api/provider-connection`            | List provider connections       |
| `GET`    | `/api/institution-connection`         | List institution connections    |
| `*`      | `/api/connections`                    | Connection management           |

### Other

| Path              | Purpose                                    |
|-------------------|--------------------------------------------|
| `/api/auth/*`     | Better Auth handlers                       |
| `/api/chat`       | AI financial advisor (streaming)           |
| `/api/currency`   | Currency list                              |
| `/api/rate`       | Exchange rates                             |
| `/api/country`    | Country list                               |
| `/mcp`            | MCP server endpoint (OAuth-authenticated)  |
| `/callback/*`     | Provider OAuth callbacks                   |
| `/oauth/*`        | OAuth consent / sign-in pages              |

### OpenAPI

The API self-documents via `@elysiajs/openapi`. Auth uses either:

- `x-api-key` header (API key)
- `Authorization: Bearer <token>` (JWT)
- Session cookie (web)

## Authentication

Handled by Better Auth (`apps/api/src/lib/auth.tsx`).

**Supported methods:** email/password, passkeys (WebAuthn), API keys, two-factor authentication, OAuth.

**Plugins:** `@better-auth/passkey`, `@better-auth/stripe`, `@better-auth/expo`, `@better-auth/oauth-provider`.

The auth middleware at `apps/api/src/middleware/auth.ts` is an Elysia plugin that protects routes.

## AI Features

- **Chat endpoint** (`apps/api/src/routes/chat/`): streams responses via Vercel AI SDK using Gemini 2.5 Flash through Cloudflare AI Gateway.
- **Financial context** (`apps/api/src/routes/chat/utils.ts`): injects accounts, transactions, and categories into the system prompt.
- **Dashboard advisor** (`apps/dashboard/src/app/(pages)/(protected)/advisor/page.tsx`): React chat UI via `@ai-sdk/react`.
- **Mobile chat** (`apps/mobile/src/app/(app)/chat/`): streaming chat with markdown rendering.

## MCP Server

Endpoint: `/mcp` (OAuth-authenticated via Better Auth as OAuth provider).

**Tools:**

| Tool               | Description                                      |
|--------------------|--------------------------------------------------|
| `get_accounts`     | Returns user accounts (limit 1–100, default 50)  |
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

| Schedule  | Job                     | Location                          |
|-----------|-------------------------|-----------------------------------|
| Hourly    | Sync exchange rates     | `apps/api/src/cron/`              |
| Daily     | Sync institution data   | `apps/api/src/cron/`              |
| Queue     | Process webhook events  | `apps/api/src/queues/webhook-events.ts` |

Queue: `guilders-webhook-events` (Cloudflare Queues, max batch 10, 5 retries, DLQ).

## Implementation Notes for Agents

1. **Accounts are the primary entity** — fetch accounts for the home view, not institution connections.
2. **Transactions belong to accounts** — always show which account a transaction belongs to.
3. **Synced vs manual** — check `institution_connection_id` to determine if an account is synced.
4. **Use the Better Auth client** for all requests; it handles authentication automatically.
5. **Currency handling** — accounts have their own currency; consider conversion for net-worth totals.
6. **Eden treaty** — the dashboard uses `@elysiajs/eden` for end-to-end type-safe API calls.
7. **React 19 compiler** — the dashboard uses `babel-plugin-react-compiler`; avoid manual `useMemo`/`useCallback` where the compiler handles it.

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
  "value": 5000,
  "currency": "USD"
}
```

**Create manual transaction:**

```typescript
POST /api/transaction
{
  "account_id": 123,
  "amount": -150.00,
  "currency": "USD",
  "date": "2026-02-19",
  "description": "Grocery shopping",
  "category": "food"
}
```

## Environment Variables

See `apps/api/.env.example` for the full list. Key groups:

- **Database:** `DATABASE_URL`
- **URLs:** `BACKEND_URL`, `DASHBOARD_URL`
- **Auth:** `BETTER_AUTH_SECRET`
- **Payments:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- **Email:** `RESEND_API_KEY`
- **AI:** `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_AI_GATEWAY`, `CLOUDFLARE_AI_GATEWAY_TOKEN`
- **Storage:** `CLOUDFLARE_R2_ACCESS_KEY`, `CLOUDFLARE_R2_SECRET_KEY`
- **Providers:** `SNAPTRADE_*`, `SALTEDGE_*`
- **Dev tunnels:** `NGROK_TOKEN`, `NGROK_URL` (optional, for provider callbacks)
