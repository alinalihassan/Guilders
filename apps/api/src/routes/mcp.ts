import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { Elysia } from "elysia";
import * as z from "zod/v4";

import { createDb } from "../lib/db";
import { oauthResourceClient } from "../lib/oauth-resource-client";

const normalizeRequestInfoHeaders = (
  headers: Record<string, string | string[] | undefined> | undefined,
): Record<string, string> => {
  if (!headers) return {};
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    const normalizedKey = key.toLowerCase();
    if (typeof value === "string") {
      normalized[normalizedKey] = value;
    } else if (Array.isArray(value)) {
      normalized[normalizedKey] = value.join(", ");
    }
  }
  return normalized;
};

const getApiOrigin = () => {
  const authBaseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000/api/auth";
  return authBaseUrl.replace(/\/api\/auth\/?$/, "");
};

const verifyOAuthAccessToken = async (
  requestHeaders: Record<string, string> | undefined,
): Promise<{ sub?: string }> => {
  const authHeader =
    requestHeaders?.authorization ??
    requestHeaders?.["x-forwarded-authorization"] ??
    requestHeaders?.["x-mcp-authorization"];
  const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;

  const apiOrigin = getApiOrigin();
  return oauthResourceClient.verifyAccessToken(accessToken, {
    verifyOptions: {
      audience: `${apiOrigin}/mcp`,
      issuer: apiOrigin,
    },
  });
};

const createMcpServer = () => {
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
    async ({ limit }, extra) => {
      try {
        const jwt = await verifyOAuthAccessToken(normalizeRequestInfoHeaders(extra.requestInfo?.headers));
        const userId = jwt.sub;
        if (!userId) {
          throw new Error("Unauthorized: access token missing subject.");
        }
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
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: error instanceof Error ? error.message : "Unauthorized",
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
    async ({ accountId, limit }, extra) => {
      try {
        const jwt = await verifyOAuthAccessToken(normalizeRequestInfoHeaders(extra.requestInfo?.headers));
        const userId = jwt.sub;
        if (!userId) {
          throw new Error("Unauthorized: access token missing subject.");
        }
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
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: error instanceof Error ? error.message : "Unauthorized",
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

export const mcpRoutes = new Elysia({ detail: { hide: true } }).all("/mcp", async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        Allow: "GET, POST, DELETE, OPTIONS",
      },
    });
  }

  // In Cloudflare local dev, idle long-lived GET SSE streams are often flagged as "hung".
  // Return a valid but immediately-closed SSE response for stateless compatibility.
  if (request.method === "GET") {
    const accept = request.headers.get("accept") ?? "";
    if (!accept.includes("text/event-stream")) {
      return Response.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Not Acceptable: Client must accept text/event-stream",
          },
          id: null,
        },
        { status: 406 },
      );
    }

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.close();
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  if (request.method === "DELETE") {
    return new Response(null, { status: 200 });
  }

  if (request.method !== "POST") {
    return Response.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Method not allowed.",
        },
        id: null,
      },
      { status: 405 },
    );
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  const server = createMcpServer();

  try {
    await server.connect(transport);
    return await transport.handleRequest(request);
  } catch (error) {
    console.error("Error handling MCP request:", error);
    return Response.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      },
      { status: 500 },
    );
  }
});
