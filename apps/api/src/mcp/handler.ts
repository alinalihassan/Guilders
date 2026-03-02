import { createMcpHandler } from "agents/mcp";

import { verifyMcpRequest } from "./auth";
import { createMcpServer } from "./server";

const getResourceMetadataUrl = () => {
  return `${process.env.BACKEND_URL}/.well-known/oauth-protected-resource`;
};

export const handleMcp = async (request: Request, env: Env, executionCtx: ExecutionContext) => {
  if (request.method === "OPTIONS") {
    const handler = createMcpHandler(
      createMcpServer({ userId: "preflight", scopes: [] }) as unknown as Parameters<
        typeof createMcpHandler
      >[0],
      {
        route: "/mcp",
        enableJsonResponse: true,
      },
    );
    return handler(request, env, executionCtx);
  }

  let authContext: { userId: string; scopes: string[] };
  try {
    authContext = await verifyMcpRequest(request.headers);
  } catch (error) {
    return Response.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32001,
          message: error instanceof Error ? error.message : "Unauthorized",
        },
        id: null,
      },
      {
        status: 401,
        headers: {
          "WWW-Authenticate": `Bearer resource_metadata="${getResourceMetadataUrl()}"`,
        },
      },
    );
  }

  const handler = createMcpHandler(
    createMcpServer(authContext) as unknown as Parameters<typeof createMcpHandler>[0],
    {
      route: "/mcp",
      enableJsonResponse: true,
    },
  );

  return handler(request, env, executionCtx);
};
