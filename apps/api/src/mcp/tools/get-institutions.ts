import * as z from "zod/v4";

import { createDb } from "../../lib/db";
import { makeTextPayload, type McpToolDefinition } from "./types";

type GetInstitutionsInput = {
  country?: string;
};

export const getInstitutionsTool: McpToolDefinition<GetInstitutionsInput> = {
  name: "get_institutions",
  description: "Return available financial institutions (banks) that can be connected",
  requiredScope: "read",
  inputSchema: {
    country: z.string().length(2).optional(),
  },
  handler: async ({ country }, _context) => {
    try {
      const db = createDb();
      const institutions = await db.query.institution.findMany({
        where: country ? { enabled: true, country } : { enabled: true },
      });

      return makeTextPayload({
        count: institutions.length,
        institutions,
      });
    } catch (error) {
      console.error("MCP get_institutions failed:", error);
      return {
        isError: true,
        content: [{ type: "text", text: "Failed to fetch institutions." }],
      };
    }
  },
};
