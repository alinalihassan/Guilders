import { createAccountTool } from "./create-account";
import { createCategoryTool } from "./create-category";
import { createMerchantTool } from "./create-merchant";
import { createTransactionTool } from "./create-transaction";
import { deleteAccountTool } from "./delete-account";
import { deleteCategoryTool } from "./delete-category";
import { deleteMerchantTool } from "./delete-merchant";
import { deleteTransactionTool } from "./delete-transaction";
import { getAccountsTool } from "./get-accounts";
import { getBalanceHistoryTool } from "./get-balance-history";
import { getCategoriesTool } from "./get-categories";
import { getDocumentFileTool } from "./get-document-file";
import { getDocumentsTool } from "./get-documents";
import { getExchangeRatesTool } from "./get-exchange-rates";
import { getInstitutionsTool } from "./get-institutions";
import { getMerchantsTool } from "./get-merchants";
import { getTransactionsTool } from "./get-transactions";
import type { McpToolDefinition } from "./types";
import { updateAccountTool } from "./update-account";
import { updateCategoryTool } from "./update-category";
import { updateMerchantTool } from "./update-merchant";
import { updateTransactionTool } from "./update-transaction";

export { registerMcpTool } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mcpTools: McpToolDefinition<any>[] = [
  getAccountsTool,
  getTransactionsTool,
  getCategoriesTool,
  getMerchantsTool,
  getDocumentsTool,
  getDocumentFileTool,
  getBalanceHistoryTool,
  getExchangeRatesTool,
  getInstitutionsTool,
  createAccountTool,
  createTransactionTool,
  createCategoryTool,
  createMerchantTool,
  updateAccountTool,
  updateTransactionTool,
  updateCategoryTool,
  updateMerchantTool,
  deleteAccountTool,
  deleteTransactionTool,
  deleteCategoryTool,
  deleteMerchantTool,
];
