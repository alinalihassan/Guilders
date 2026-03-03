import { tool } from "ai";
import * as z from "zod/v4";

import { mcpTools } from "../../mcp/tools";
import type { McpContentBlock, McpToolContext } from "../../mcp/tools/types";

/**
 * Returns a markdown list of MCP tool names and descriptions for use in the system prompt.
 */
export function getMcpToolsOverview(): string {
  return mcpTools.map((t) => `- **${t.name}**: ${t.description}`).join("\n");
}

function mcpContentToModelOutput(content: McpContentBlock[]) {
  const hasMedia = content.some((c) => c.type === "image" || c.type === "resource");
  if (!hasMedia) {
    return {
      type: "text" as const,
      value: content
        .filter((c): c is Extract<typeof c, { type: "text" }> => c.type === "text")
        .map((c) => c.text)
        .join("\n"),
    };
  }

  return {
    type: "content" as const,
    value: content.map((block) => {
      if (block.type === "text") {
        return { type: "text" as const, text: block.text };
      }
      if (block.type === "image") {
        return {
          type: "image-data" as const,
          data: block.data,
          mediaType: block.mimeType,
        };
      }
      return {
        type: "file-data" as const,
        data: block.resource.blob,
        mediaType: block.resource.mimeType,
      };
    }),
  };
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      execute: async (input: any) => {
        const result = await mcpTool.handler(input as Record<string, unknown>, context);
        return result;
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toModelOutput: ({ output }: { output: any }) => mcpContentToModelOutput(output.content),
    });
  }

  return tools;
}
