import { and, eq, inArray } from "drizzle-orm";
import * as z from "zod/v4";

import { document } from "../../db/schema/documents";
import { DocumentEntityTypeEnum } from "../../db/schema/enums";
import { createDb } from "../../lib/db";
import { makeTextPayload, type McpToolDefinition } from "./types";

type GetAccountsInput = {
  limit: number;
};

export const getAccountsTool: McpToolDefinition<GetAccountsInput> = {
  name: "get_accounts",
  description: "Return authenticated user's accounts with associated document IDs",
  requiredScope: "read",
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

      const accountIds = userAccounts.map((a) => a.id);
      const docRows =
        accountIds.length > 0
          ? await db
              .select({ id: document.id, entity_id: document.entity_id })
              .from(document)
              .where(
                and(
                  eq(document.user_id, userId),
                  eq(document.entity_type, DocumentEntityTypeEnum.account),
                  inArray(document.entity_id, accountIds),
                ),
              )
          : [];

      const docMap = new Map<number, number[]>();
      for (const row of docRows) {
        const list = docMap.get(row.entity_id) ?? [];
        list.push(row.id);
        docMap.set(row.entity_id, list);
      }

      const accounts = userAccounts.map((a) => ({
        ...a,
        document_ids: docMap.get(a.id) ?? [],
      }));

      return makeTextPayload({
        userId,
        count: accounts.length,
        accounts,
      });
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
