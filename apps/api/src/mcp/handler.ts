import { createMcpHandler } from "agents/mcp";

import { verifyMcpRequest } from "./auth";
import { createMcpServer } from "./server";

export const handleMcp = async (request: Request, env: Env, executionCtx: ExecutionContext) => {
  if (request.method === "OPTIONS") {
    const handler = createMcpHandler(createMcpServer({ userId: "preflight" }) as unknown as Parameters<
      typeof createMcpHandler
    >[0], {
      route: "/mcp",
      enableJsonResponse: true,
    });
    return handler(request, env, executionCtx);
  }

  // Enforce OAuth at MCP session start. Follow-up stream/session requests
  // use mcp-session-id and may not repeat the Authorization header.
  const sessionId = request.headers.get("mcp-session-id");
  const mustAuthenticate = request.method === "POST" && !sessionId;

  if (!mustAuthenticate) {
    const handler = createMcpHandler(createMcpServer({ userId: "session" }) as unknown as Parameters<
      typeof createMcpHandler
    >[0], {
      route: "/mcp",
      enableJsonResponse: true,
    });
    return handler(request, env, executionCtx);
  }

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

  const handler = createMcpHandler(createMcpServer(authContext) as unknown as Parameters<typeof createMcpHandler>[0], {
    route: "/mcp",
    enableJsonResponse: true,
  });

  return handler(request, env, executionCtx);
};
