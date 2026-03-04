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

/** AI SDK content block for tool result: text, media (image), or file-data (blob required). */
type ToolResultContentBlock =
  | { type: "text"; text: string }
  | { type: "media"; data: string; mediaType: string }
  | { type: "file-data"; data: string; mediaType: string };

function mcpContentToModelOutput(
  content: McpContentBlock[],
): { type: "text"; value: string } | { type: "content"; value: ToolResultContentBlock[] } {
  const hasMedia = content.some((c) => c.type === "image" || c.type === "resource");
  if (!hasMedia) {
    return {
      type: "text",
      value: content
        .filter((c): c is Extract<typeof c, { type: "text" }> => c.type === "text")
        .map((c) => c.text)
        .join("\n"),
    };
  }

  const value: ToolResultContentBlock[] = [];
  for (const block of content) {
    if (block.type === "text") {
      value.push({ type: "text", text: block.text });
    } else if (block.type === "image") {
      value.push({
        type: "media",
        data: block.data,
        mediaType: block.mimeType,
      });
    } else if ("blob" in block.resource) {
      value.push({
        type: "file-data",
        data: block.resource.blob,
        mediaType: block.resource.mimeType ?? "application/octet-stream",
      });
    }
    // resource with text only: skip or could add as text; AI SDK content prefers blob for file-data
  }

  return { type: "content", value };
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
