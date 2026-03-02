import * as z from "zod/v4";

import { account } from "../../db/schema/accounts";
import { AccountSubtypeEnum, AccountTypeEnum } from "../../db/schema/enums";
import { createDb } from "../../lib/db";
import { subtypeToType } from "../../routes/account/types";
import { makeTextPayload, type McpToolDefinition } from "./types";

type CreateAccountInput = {
  name: string;
  subtype: string;
  value: number;
  currency: string;
  notes?: string;
};

export const createAccountTool: McpToolDefinition<CreateAccountInput> = {
  name: "create_account",
  description: "Create a new manual account for the authenticated user",
  requiredScope: "write",
  inputSchema: {
    name: z.string().min(1).max(100),
    subtype: z.enum(Object.values(AccountSubtypeEnum) as [string, ...string[]]),
    value: z.number(),
    currency: z.string().length(3),
    notes: z.string().optional(),
  },
  handler: async ({ name, subtype, value, currency, notes }, { userId }) => {
    try {
      const db = createDb();
      const type = subtypeToType[subtype] || AccountTypeEnum.asset;

      let adjustedValue = value;
      if (type === AccountTypeEnum.liability && adjustedValue > 0) {
        adjustedValue = -adjustedValue;
      }

      const [newAccount] = await db
        .insert(account)
        .values({
          name,
          subtype: subtype as AccountSubtypeEnum,
          type: type as AccountTypeEnum,
          value: adjustedValue.toString(),
          currency,
          notes: notes ?? "",
          user_id: userId,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();

      if (!newAccount) {
        return {
          isError: true,
          content: [{ type: "text", text: "Failed to create account." }],
        };
      }

      return makeTextPayload({
        userId,
        account: newAccount,
      });
    } catch (error) {
      console.error("MCP create_account failed:", error);
      return {
        isError: true,
        content: [{ type: "text", text: "Failed to create account." }],
      };
    }
  },
};
