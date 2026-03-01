export const McpScope = {
  read: "read",
  write: "write",
} as const;

export type McpScope = (typeof McpScope)[keyof typeof McpScope];

export type McpScopeInfo = {
  label: string;
  description: string;
  capabilities: string[];
};

export const MCP_SCOPE_INFO: Record<McpScope, McpScopeInfo> = {
  [McpScope.read]: {
    label: "Read access",
    description: "View your financial data",
    capabilities: ["View your accounts and balances", "View your transactions"],
  },
  [McpScope.write]: {
    label: "Write access",
    description: "Create and modify your financial data",
    capabilities: [
      "Create new accounts on your behalf",
      "Create transactions on your behalf",
    ],
  },
};

export const DISPLAY_SCOPE_INFO: Record<string, { label: string; description: string }> = {
  openid: { label: "OpenID", description: "Verify your identity" },
  ...MCP_SCOPE_INFO,
};
