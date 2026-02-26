import * as z from "zod/v4";

import { createDb } from "../../lib/db";
import type { McpToolDefinition } from "./types";

type GetAccountsInput = {
  limit: number;
};

export const getAccountsTool: McpToolDefinition<GetAccountsInput> = {
  name: "get_accounts",
  description: "Return authenticated user's accounts",
  inputSchema: {
    limit: z.number().int().min(1).max(100).default(50),
  },
  handler: async ({ limit }, { userId }) => {
    try {
      const db = createDb();
      const userAccounts = await db.query.account.findMany({
        where: {
          user_id: userId,
        },
        limit,
        orderBy: (accounts, { desc }) => desc(accounts.updated_at),
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                userId,
                count: userAccounts.length,
                accounts: userAccounts,
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error) {
      console.error("MCP get_accounts failed:", error);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: "Failed to fetch accounts.",
          },
        ],
      };
    }
  },
};
