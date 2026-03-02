import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { McpScope } from "./scopes";
import { mcpTools, registerMcpTool } from "./tools";

type McpAuthContext = {
  userId: string;
  scopes: string[];
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

  const hasCustomScopes = scopes.some(
    (s) => s === McpScope.read || s === McpScope.write,
  );
  const grantedTools = hasCustomScopes
    ? mcpTools.filter((tool) => scopes.includes(tool.requiredScope))
    : mcpTools;

  for (const tool of grantedTools) {
    registerMcpTool(server, tool, { userId });
  }

  return server;
};
