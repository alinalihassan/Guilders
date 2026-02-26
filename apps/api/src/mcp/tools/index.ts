import { getAccountsTool } from "./get-accounts";
import { getTransactionsTool } from "./get-transactions";

export { registerMcpTool } from "./types";

export const mcpTools = [getAccountsTool, getTransactionsTool];
