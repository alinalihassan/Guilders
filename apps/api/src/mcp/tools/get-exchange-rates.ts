import { eq } from "drizzle-orm";
import * as z from "zod/v4";

import { rate } from "../../db/schema/rates";
import { createDb } from "../../lib/db";
import { makeTextPayload, type McpToolDefinition } from "./types";

type GetExchangeRatesInput = {
  date: string;
  base?: string;
};

export const getExchangeRatesTool: McpToolDefinition<GetExchangeRatesInput> = {
  name: "get_exchange_rates",
  description:
    "Return exchange rates for a specific date with optional base currency conversion (defaults to EUR)",
  requiredScope: "read",
  inputSchema: {
    date: z.string().date(),
    base: z.string().length(3).optional(),
  },
  handler: async ({ date: targetDate, base }, _context) => {
    try {
      const db = createDb();
      const baseCurrency = base || "EUR";

      const rates = await db.select().from(rate).where(eq(rate.date, targetDate));

      if (rates.length === 0) {
        return {
          isError: true,
          content: [{ type: "text", text: `No exchange rates available for ${targetDate}.` }],
        };
      }

      if (baseCurrency === "EUR") {
        return makeTextPayload({ date: targetDate, base: baseCurrency, count: rates.length, rates });
      }

      const baseRate = rates.find((r) => r.currency_code === baseCurrency);
      if (!baseRate) {
        return {
          isError: true,
          content: [{ type: "text", text: `Base currency ${baseCurrency} not found in rates.` }],
        };
      }

      const baseRateValue = parseFloat(baseRate.rate);
      const rebased = rates.map((r) => ({
        currency_code: r.currency_code,
        date: r.date,
        rate: (parseFloat(r.rate) / baseRateValue).toString(),
      }));

      return makeTextPayload({ date: targetDate, base: baseCurrency, count: rebased.length, rates: rebased });
    } catch (error) {
      console.error("MCP get_exchange_rates failed:", error);
      return {
        isError: true,
        content: [{ type: "text", text: "Failed to fetch exchange rates." }],
      };
    }
  },
};
