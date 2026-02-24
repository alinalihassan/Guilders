# Guilders Data Model Documentation

## Overview

This document explains the data model for Guilders, a personal finance application that supports both manual and synchronized financial accounts.

## Core Concepts

### Accounts (The Central Entity)

Accounts represent the user's financial accounts and holdings. Every account belongs to a user and has a type and value.

**Key Fields:**

- `id`: Unique identifier
- `user_id`: Owner of the account
- `name`: Account name (e.g., "Chase Checking", "Bitcoin Wallet")
- `type`: "asset" or "liability"
- `subtype`: depository, brokerage, crypto, property, vehicle, creditcard, loan, stock
- `value`: Current value in the specified currency
- `currency`: ISO currency code (e.g., "USD", "EUR")
- `institution_connection_id`: Links to institution connection (optional, for synced accounts)

**Account Types:**

- **Manual Accounts**: Created and updated manually by the user (e.g., cash under mattress, physical gold)
- **Synced Accounts**: Automatically updated through financial providers (e.g., bank accounts via Plaid)

### Data Flow for Synced Accounts

```
Provider (e.g., Plaid)
  ↓
Institution (e.g., Revolut Bank)
  ↓
Provider Connection (user ↔ provider link)
  ↓
Institution Connection (connection to specific institution)
  ↓
Accounts (accounts/investments from the institution)
  ↓
Transactions (transactions from those accounts)
```

### Providers

Providers are financial data aggregators that can connect to various institutions.

**Examples:**

- Plaid - Connects to thousands of banks worldwide
- Yodlee - Financial data aggregation
- Coinbase API - Crypto exchange
- Alpaca - Stock trading

**Key Fields:**

- `id`: Unique identifier
- `name`: Provider name
- `logo_url`: Provider logo

### Institutions

Financial institutions (banks, brokerages, crypto exchanges) that can be accessed through providers.

**Examples:**

- Chase Bank
- Revolut
- Coinbase
- Fidelity

**Key Fields:**

- `id`: Unique identifier
- `name`: Institution name
- `logo_url`: Institution logo
- `country`: Country code
- `provider_id`: Which provider can connect to this institution
- `provider_institution_id`: External ID used by the provider

### Provider Connections

Links a user to a provider. Represents an authenticated connection to a financial data provider.

**Key Fields:**

- `id`: Unique identifier
- `provider_id`: Which provider
- `user_id`: Which user
- `secret`: Encrypted authentication token/credentials

**Note:** A user typically has one provider connection per provider they use.

### Institution Connections

Links a provider connection to a specific institution. Represents the user's accounts at a particular institution.

**Key Fields:**

- `id`: Unique identifier
- `institution_id`: Which institution
- `provider_connection_id`: Which provider connection (links to user)
- `connection_id`: External connection identifier from provider
- `broken`: Whether the connection is broken/expired

**Note:** Multiple institution connections can exist for one provider connection (e.g., Plaid can connect to multiple banks).

### Transactions

Financial transactions associated with accounts.

**Key Fields:**

- `id`: Unique identifier
- `account_id`: Which account this transaction belongs to
- `amount`: Transaction amount
- `currency`: Currency code
- `date`: Transaction date
- `description`: Transaction description
- `category`: Transaction category

**Types:**

- **Manual Transactions**: Created by the user for manual accounts
- **Synced Transactions**: Automatically imported from synced accounts

## API Endpoints

### Accounts

- `GET /api/account` - List all user's accounts
- `POST /api/account` - Create manual account
- `GET /api/account/:id` - Get specific account
- `PUT /api/account/:id` - Update account
- `DELETE /api/account/:id` - Delete account

### Transactions

- `GET /api/transaction` - List user's transactions (should be ordered by date desc)
- `POST /api/transaction` - Create transaction
- `GET /api/account/:id/transaction` - List transactions for specific account

### Institution Connections

- `GET /api/institution-connection` - List institution connections with details

## Mobile App Architecture

### Home Tab

Should display:

1. **Total Net Worth**: Sum of all account values minus liabilities
2. **Account Breakdown**: List of accounts grouped by type
3. **Recent Transactions**: Latest transactions across all accounts

**Data Fetching:**

```typescript
// Get all accounts (both manual and synced)
GET /api/account

// Get recent transactions
GET /api/transaction?limit=10
```

### Settings Tab

Should display:

1. User profile info (from Better Auth session)
2. App settings (currency, theme)
3. Account management (sign out)
4. Provider connections management

## Authentication Flow

All API endpoints require authentication via:

1. **Better Auth Session Cookie** (for web)
2. **Bearer Token** (for mobile)

The mobile app uses Better Auth client with expo-secure-store for token persistence.

## Implementation Notes

### For Agents Working on This Codebase

1. **Accounts are the primary entities** - Always fetch accounts for the home view, not institution connections
2. **Transactions belong to accounts** - When displaying transactions, show which account they belong to
3. **Synced vs Manual** - Check `institution_connection_id` to determine if an account is synced
4. **Single API client** - Use the Better Auth client for all requests; it handles authentication automatically
5. **Currency handling** - Accounts have their own currency; consider conversion for totals

### Common Patterns

**Fetch Dashboard Data:**

```typescript
// Home tab should fetch:
const accounts = await fetch("/api/account").then((r) => r.json());
const totalValue = accounts.reduce(
  (sum, a) => sum + (a.type === "liability" ? -1 : 1) * Number(a.value),
  0,
);

const transactions = await fetch("/api/transaction?limit=20").then((r) => r.json());
```

**Create Manual Account:**

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

**Create Manual Transaction:**

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
