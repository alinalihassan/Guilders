import { and, eq } from "drizzle-orm";
import * as z from "zod/v4";

import { account } from "../../db/schema/accounts";
import { AccountSubtypeEnum, AccountTypeEnum } from "../../db/schema/enums";
import { createDb } from "../../lib/db";
import { filterLockedUpdate } from "../../lib/locked-attributes";
import { subtypeToType } from "../../routes/account/types";
import { makeTextPayload, type McpToolDefinition } from "./types";

type UpdateAccountInput = {
  id: number;
  name?: string;
  subtype?: string;
  value?: number;
  currency?: string;
  notes?: string;
};

export const updateAccountTool: McpToolDefinition<UpdateAccountInput> = {
  name: "update_account",
  description: "Update an existing account (name, subtype, value, currency, notes)",
  requiredScope: "write",
  inputSchema: {
    id: z.number().int(),
    name: z.string().min(1).max(100).optional(),
    subtype: z.enum(Object.values(AccountSubtypeEnum) as [string, ...string[]]).optional(),
    value: z.number().optional(),
    currency: z.string().length(3).optional(),
    notes: z.string().optional(),
  },
  handler: async ({ id, ...updates }, { userId }) => {
    try {
      const db = createDb();

      const existing = await db.query.account.findFirst({
        where: { id, user_id: userId },
      });

      if (!existing) {
        return {
          isError: true,
          content: [{ type: "text", text: "Account not found or does not belong to user." }],
        };
      }

      const body: Record<string, unknown> = {};
      if (updates.name !== undefined) body.name = updates.name;
      if (updates.subtype !== undefined) body.subtype = updates.subtype;
      if (updates.value !== undefined) body.value = updates.value;
      if (updates.currency !== undefined) body.currency = updates.currency;
      if (updates.notes !== undefined) body.notes = updates.notes;

      const { allowed, blocked } = filterLockedUpdate(body, existing.locked_attributes);
      if (blocked.length > 0) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Cannot update locked attributes: ${blocked.map(String).join(", ")}`,
            },
          ],
        };
      }

      let type: AccountTypeEnum = existing.type;
      if (allowed.subtype && allowed.subtype !== existing.subtype) {
        type = (subtypeToType[allowed.subtype as string] || AccountTypeEnum.asset) as AccountTypeEnum;
      }

      let value: number;
      if (allowed.value !== undefined) {
        value = parseFloat(String(allowed.value));
      } else {
        value = parseFloat(existing.value.toString());
      }
      if (type === AccountTypeEnum.liability && value > 0) {
        value = -value;
      }

      const [updated] = await db
        .update(account)
        .set({
          ...allowed,
          type,
          value: value.toString(),
          updated_at: new Date(),
        })
        .where(and(eq(account.id, id), eq(account.user_id, userId)))
        .returning();

      if (!updated) {
        return {
          isError: true,
          content: [{ type: "text", text: "Failed to update account." }],
        };
      }

      return makeTextPayload({ userId, account: updated });
    } catch (error) {
      console.error("MCP update_account failed:", error);
      return {
        isError: true,
        content: [{ type: "text", text: "Failed to update account." }],
      };
    }
  },
};
