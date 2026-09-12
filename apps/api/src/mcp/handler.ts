import { requireMcpAuth } from "@better-auth/mcp";
import { createMcpHandler } from "@modelcontextprotocol/server";

import { createAuth, getAuthIssuer, getMcpResource } from "../lib/auth";
import { createMcpServer } from "./server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id",
};

const withCors = (response: Response) => {
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }
  return response;
};

export const handleMcp = async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const auth = createAuth();
  const resource = getMcpResource();

  const protectedHandler = requireMcpAuth(
    auth,
    async (req, claims) => {
      const userId = typeof claims.sub === "string" ? claims.sub : "";
      if (!userId) {
        return Response.json(
          {
            jsonrpc: "2.0",
            error: { code: -32001, message: "Unauthorized: access token missing subject." },
            id: null,
          },
          { status: 401 },
        );
      }

      const scopes =
        typeof claims.scope === "string" ? claims.scope.split(" ").filter(Boolean) : [];
      const mcp = createMcpHandler(() => createMcpServer({ userId, scopes }), {
        legacy: "reject",
      });

      const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
      return mcp.fetch(req, {
        authInfo: {
          token,
          clientId: typeof claims.client_id === "string" ? claims.client_id : "unknown",
          scopes,
          extra: { userId },
        },
      });
    },
    {
      resource,
      issuer: getAuthIssuer(),
      jwksUrl: `${getAuthIssuer()}/jwks`,
      challengeScopes: ["read", "write"],
    },
  );

  return withCors(await protectedHandler(request));
};
