import { createDb } from "../../lib/db";
import { makeTextPayload, type McpToolDefinition } from "./types";

type GetMerchantsInput = Record<string, never>;

export const getMerchantsTool: McpToolDefinition<GetMerchantsInput> = {
  name: "get_merchants",
  description: "Return authenticated user's merchants",
  requiredScope: "read",
  inputSchema: {},
  handler: async (_input, { userId }) => {
    try {
      const db = createDb();
      const merchants = await db.query.merchant.findMany({
        where: {
          user_id: userId,
        },
        orderBy: (merchantsEntity, { asc }) => asc(merchantsEntity.name),
      });

      return makeTextPayload({
        userId,
        count: merchants.length,
        merchants,
      });
    } catch (error) {
      console.error("MCP get_merchants failed:", error);
      return {
        isError: true,
        content: [{ type: "text", text: "Failed to fetch merchants." }],
      };
    }
  },
};
