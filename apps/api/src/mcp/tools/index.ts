import { applyRuleTool } from "./apply-rule";
import { createAccountTool } from "./create-account";
import { createCategoryTool } from "./create-category";
import { createMerchantTool } from "./create-merchant";
import { createRuleTool } from "./create-rule";
import { createTagTool } from "./create-tag";
import { createTransactionTool } from "./create-transaction";
import { deleteAccountTool } from "./delete-account";
import { deleteCategoryTool } from "./delete-category";
import { deleteMerchantTool } from "./delete-merchant";
import { deleteRuleTool } from "./delete-rule";
import { deleteTagTool } from "./delete-tag";
import { deleteTransactionTool } from "./delete-transaction";
import { getAccountsTool } from "./get-accounts";
import { getBalanceHistoryTool } from "./get-balance-history";
import { getCategoriesTool } from "./get-categories";
import { getDocumentFileTool } from "./get-document-file";
import { getDocumentsTool } from "./get-documents";
import { getExchangeRatesTool } from "./get-exchange-rates";
import { getInstitutionsTool } from "./get-institutions";
import { getMerchantsTool } from "./get-merchants";
import { getRulesTool } from "./get-rules";
import { getTagsTool } from "./get-tags";
import { getTransactionsTool } from "./get-transactions";
import { previewRuleTool } from "./preview-rule";
import type { McpToolDefinition } from "./types";
import { updateAccountTool } from "./update-account";
import { updateCategoryTool } from "./update-category";
import { updateMerchantTool } from "./update-merchant";
import { updateRuleTool } from "./update-rule";
import { updateTransactionTool } from "./update-transaction";

export { registerMcpTool } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mcpTools: McpToolDefinition<any>[] = [
  getAccountsTool,
  getTransactionsTool,
  getCategoriesTool,
  getTagsTool,
  getRulesTool,
  getMerchantsTool,
  getDocumentsTool,
  getDocumentFileTool,
  getBalanceHistoryTool,
  getExchangeRatesTool,
  getInstitutionsTool,
  createAccountTool,
  createTransactionTool,
  createCategoryTool,
  createTagTool,
  createRuleTool,
  createMerchantTool,
  updateAccountTool,
  updateTransactionTool,
  updateCategoryTool,
  updateRuleTool,
  updateMerchantTool,
  deleteAccountTool,
  deleteTransactionTool,
  deleteCategoryTool,
  deleteTagTool,
  deleteRuleTool,
  deleteMerchantTool,
  previewRuleTool,
  applyRuleTool,
];
