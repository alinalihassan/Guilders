import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";

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

  for (const tool of mcpTools) {
    registerMcpTool(server, tool, { userId });
  }

  return server;
};
