// import { readFileSync } from "node:fs";

import { openapi } from "@elysiajs/openapi";

import packageJson from "../../../../package.json";

const descriptionText = `
**Guilders API Reference**

API Documentation for Guilders, a personal finance platform that aggregates manual and synced financial data into a single platform, and exposes a developer-friendly API with MCP support so external tools and AI agents can read and write financial data on the user's behalf.

> [!WARNING]
> The API is currently in beta and may be subject to changes.
`;

const accountText = `
Accounts are the core entity in Guilders: each account represents an asset or liability (e.g. bank, investment, property, loan, credit card) belonging to a user.

Accounts can be either "manual" (user-created, updated by hand) or "synced" (managed by a linked financial provider). Every account has a type (\`asset\` or \`liability\`), subtype (e.g. \`depository\`, \`brokerage\`, \`property\`, \`creditcard\`, \`loan\`), value, and currency.

Accounts can be nested, allowing for complex asset/liability hierarchies, like an account representing a retirement account, which contains sub-accounts for different investments (e.g. stocks, bonds, mutual funds). The child accounts are represented by the \`parent\` attribute. Manual accounts cannot be nested currently. The parent account's value is the sum of the child account values, so it's important to exclude child accounts when calculating net worth.

> [!NOTE]
> Synced accounts are currently only supported in the dashboard, not in the API.
`;

const transactionText = `
Transactions are the other core entity in Guilders: each transaction represents a financial event (e.g. deposit, withdrawal, purchase, sale, transfer) belonging to an account. Transactions have an amount, currency, date, description, and category.

Transactions can be nested, allowing for complex financial event hierarchies, like a transaction representing a deposit to a retirement account, which contains sub-transactions for different investments (e.g. stocks, bonds, mutual funds). The child transactions are represented by the \`parent\` attribute. Manual transactions cannot be nested currently. The parent transaction's amount is the sum of the child transaction amounts, so it's important to exclude child transactions when calculating net worth.

> [!NOTE]
> Synced transactions are currently only supported in the dashboard, not in the API.
`;

const categoryText = `
Categories are used to group transactions into income and expense categories. Each category has a **name**, **color**, **icon**, and **classification** (\`expense\` or \`income\`).

- **Color** is a hex string (e.g. \`#64748b\`). It is used in the UI to show a tinted badge for the category.
- **Icon** is a Lucide icon name in kebab-case (e.g. \`circle-dot\`, \`shopping-cart\`, \`utensils\`). The API validates that the icon is a valid Lucide icon name. If omitted or null, the dashboard uses a default icon.

Categories can be nested via \`parent_id\`, allowing hierarchies (e.g. a "Food" category with children "Restaurant", "Groceries"). The child categories are represented by the \`parent\` attribute in the tree response. New users receive default categories with preset names, colors, and icons.
`;

export const getOpenAPI = async () => {
  // const mainMd = readFileSync("docs/main.md");
  return openapi({
    documentation: {
      info: {
        title: "Guilders API Reference",
        version: packageJson.version,
        description: descriptionText,
      },
      tags: [
        {
          name: "Accounts",
          description: accountText,
        },
        {
          name: "Transactions",
          description: transactionText,
        },
        { name: "Categories", description: categoryText },
        {
          name: "Connections",
          description: "Provider connection flow: create, reconnect, refresh, sync.",
        },
        {
          name: "Providers",
          description: "Financial data providers (e.g. open banking, brokerages).",
        },
        {
          name: "Institutions",
          description: "Banks and institutions available through providers.",
        },
        { name: "Provider Connections", description: "User's connections to providers." },
        {
          name: "Institution Connections",
          description: "Per-institution connection state and accounts.",
        },
        { name: "Balance History", description: "Net worth and per-account balance over time." },
        { name: "Conversations", description: "Chat conversation list and metadata." },
        { name: "Currencies", description: "Supported ISO currencies." },
        { name: "Rates", description: "Exchange rates for currency conversion." },
        { name: "Countries", description: "Countries with ISO codes." },
        { name: "Documents", description: "Document upload, metadata, and download." },
        { name: "Webhook", description: "Webhook endpoints and event delivery config." },
      ],
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
    // @ts-expect-error - Scalar types are not inferred correctly
    scalar: {
      hideClientButton: true,
      telemetry: false,
      hideDarkModeToggle: true,
      customCss: `
        /* Hide "Powered by Scalar" block in sidebar */
        div.darklight-reference.border-sidebar-border { display: none !important; }
        div.border-sidebar-border:has(a[href="https://www.scalar.com"]) { display: none !important; }
        a[href="https://www.scalar.com"] { display: none !important; }
      `,
    },
  });
};
