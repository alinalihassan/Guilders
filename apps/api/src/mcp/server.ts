import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";

import { createDb } from "../lib/db";

type McpAuthContext = {
  userId: string;
};

export const createMcpServer = ({ userId }: McpAuthContext) => {
  const server = new McpServer(
    {
      name: "guilders-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        logging: {},
      },
    },
  );

  server.registerPrompt(
    "greeting-template",
    {
      description: "A simple greeting prompt template",
      argsSchema: {
        name: z.string().describe("Name to include in greeting"),
      },
    },
    async ({ name }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please greet ${name} in a friendly manner.`,
          },
        },
      ],
    }),
  );

  server.registerTool(
    "get_accounts",
    {
      description: "Return authenticated user's accounts",
      inputSchema: {
        limit: z.number().int().min(1).max(100).default(50),
      },
    },
    async ({ limit }) => {
      try {
        const db = createDb();
        const userAccounts = await db.query.account.findMany({
          where: {
            user_id: userId,
          },
          limit,
          orderBy: (accounts, { desc }) => desc(accounts.updated_at),
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  userId,
                  count: userAccounts.length,
                  accounts: userAccounts,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        console.error("MCP get_accounts failed:", error);
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "Failed to fetch accounts.",
            },
          ],
        };
      }
    },
  );

  server.registerTool(
    "get_transactions",
    {
      description: "Return authenticated user's transactions (optional account filter)",
      inputSchema: {
        accountId: z.number().int().optional(),
        limit: z.number().int().min(1).max(100).default(50),
      },
    },
    async ({ accountId, limit }) => {
      try {
        const db = createDb();
        const userTransactions = await db.query.transaction.findMany({
          where:
            accountId === undefined
              ? {
                  account: {
                    user_id: userId,
                  },
                }
              : {
                  account_id: accountId,
                  account: {
                    user_id: userId,
                  },
                },
          limit,
          orderBy: (transactions, { desc }) => desc(transactions.date),
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  userId,
                  count: userTransactions.length,
                  transactions: userTransactions,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        console.error("MCP get_transactions failed:", error);
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "Failed to fetch transactions.",
            },
          ],
        };
      }
    },
  );

  server.registerResource(
    "greeting-resource",
    "https://guilders.app/mcp/resources/greeting",
    {
      mimeType: "text/plain",
    },
    async () => ({
      contents: [
        {
          uri: "https://guilders.app/mcp/resources/greeting",
          text: "Hello from Guilders MCP!",
        },
      ],
    }),
  );

  return server;
};
