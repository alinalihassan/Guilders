import { tool } from "ai";
import * as z from "zod/v4";

import { mcpTools } from "../../mcp/tools";
import type { McpToolContext } from "../../mcp/tools/types";

/**
 * Returns a markdown list of MCP tool names and descriptions for use in the system prompt.
 */
export function getMcpToolsOverview(): string {
  return mcpTools.map((t) => `- **${t.name}**: ${t.description}`).join("\n");
}

/**
 * Converts MCP tool definitions into AI SDK `tool()` objects for use with `streamText`.
 */
export function buildChatTools(userId: string) {
  const context: McpToolContext = { userId };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools: Record<string, any> = {};

  for (const mcpTool of mcpTools) {
    const schema = z.object(mcpTool.inputSchema);

    tools[mcpTool.name] = tool({
      description: mcpTool.description,
      inputSchema: schema,
      execute: async (input) => {
        const result = await mcpTool.handler(input as Record<string, unknown>, context);
        return result.content.map((c) => c.text).join("\n");
      },
    });
  }

  return tools;
}
