import { createMcpHandler } from "agents/mcp";

import { verifyMcpRequest } from "./auth";
import { createMcpServer } from "./server";

export const handleMcp = async (request: Request, env: Env, executionCtx: ExecutionContext) => {
  if (request.method === "OPTIONS") {
    const handler = createMcpHandler(
      createMcpServer({ userId: "preflight" }) as unknown as Parameters<typeof createMcpHandler>[0],
      {
        route: "/mcp",
        enableJsonResponse: true,
      },
    );
    return handler(request, env, executionCtx);
  }

  // Authenticate every non-preflight request so the MCP server always receives
  // the actual user context instead of a placeholder session user.

  let authContext: { userId: string };
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
      { status: 401 },
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
