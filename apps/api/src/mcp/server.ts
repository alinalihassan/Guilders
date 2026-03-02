import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { McpScope } from "./scopes";
import { mcpTools, registerMcpTool } from "./tools";

type McpAuthContext = {
  userId: string;
  scopes: string[] | null;
};

export const createMcpServer = ({ userId, scopes }: McpAuthContext) => {
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

  // null = opaque token / decode failure; [] = decoded but no scope. Both get read-only.
  const effectiveScopes = scopes === null || scopes.length === 0 ? [McpScope.read] : scopes;
  const grantedTools = mcpTools.filter((tool) => effectiveScopes.includes(tool.requiredScope));

  for (const tool of grantedTools) {
    registerMcpTool(server, tool, { userId });
  }

  return server;
};
