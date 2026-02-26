import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { mcpTools, registerMcpTool } from "./tools";

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

  for (const tool of mcpTools) {
    registerMcpTool(server, tool, { userId });
  }

  return server;
};
