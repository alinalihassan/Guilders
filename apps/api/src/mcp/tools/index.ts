import { createAccountTool } from "./create-account";
import { createCategoryTool } from "./create-category";
import { createTransactionTool } from "./create-transaction";
import { deleteAccountTool } from "./delete-account";
import { deleteTransactionTool } from "./delete-transaction";
import { getAccountsTool } from "./get-accounts";
import { getBalanceHistoryTool } from "./get-balance-history";
import { getCategoriesTool } from "./get-categories";
import { getExchangeRatesTool } from "./get-exchange-rates";
import { getInstitutionsTool } from "./get-institutions";
import { getTransactionsTool } from "./get-transactions";
import { updateAccountTool } from "./update-account";
import { updateTransactionTool } from "./update-transaction";
import type { McpToolDefinition } from "./types";

export { registerMcpTool } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mcpTools: McpToolDefinition<any>[] = [
  getAccountsTool,
  getTransactionsTool,
  getCategoriesTool,
  getBalanceHistoryTool,
  getExchangeRatesTool,
  getInstitutionsTool,
  createAccountTool,
  createTransactionTool,
  createCategoryTool,
  updateAccountTool,
  updateTransactionTool,
  deleteAccountTool,
  deleteTransactionTool,
];
