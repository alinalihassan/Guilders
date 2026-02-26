import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type * as z from "zod/v4";

export type McpToolContext = {
  userId: string;
};

export type McpToolResult = {
  isError?: boolean;
  content: Array<{
    type: "text";
    text: string;
  }>;
};

export type McpToolDefinition<TInput extends Record<string, unknown> = Record<string, unknown>> =
  {
    name: string;
    description: string;
    inputSchema: Record<string, z.ZodTypeAny>;
    handler: (input: TInput, context: McpToolContext) => Promise<McpToolResult>;
  };

export const registerMcpTool = <TInput extends Record<string, unknown>>(
  server: McpServer,
  tool: McpToolDefinition<TInput>,
  context: McpToolContext,
) => {
  server.registerTool(
    tool.name,
    {
      description: tool.description,
      inputSchema: tool.inputSchema,
    },
    async (input) => tool.handler(input as TInput, context),
  );
};
