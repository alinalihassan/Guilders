import { createAccountTool } from "./create-account";
import { createTransactionTool } from "./create-transaction";
import { getAccountsTool } from "./get-accounts";
import { getTransactionsTool } from "./get-transactions";
import type { McpToolDefinition } from "./types";

export { registerMcpTool } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any TODO: Fix
export const mcpTools: McpToolDefinition<any>[] = [
  getAccountsTool,
  getTransactionsTool,
  createAccountTool,
  createTransactionTool,
];
