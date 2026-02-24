import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { z } from "zod/v3";

export const APPROVED_COMPONENT_TYPES = ["StockCard"] as const;

export const advisorCatalog = defineCatalog(schema, {
  components: {
    StockCard: {
      props: z.object({
        accountId: z.number(),
        subtype: z.string().nullable(),
        image: z.string().nullable(),
        symbol: z.string(),
        accountName: z.string(),
        currency: z.string(),
        currentValue: z.string(),
        totalChange: z.string().nullable(),
      }),
      description:
        "Stable single stock account card with click-through to account details.",
      example: {
        accountId: 123,
        subtype: "stock",
        image: "https://example.com/logo.png",
        symbol: "NVDA",
        accountName: "Trading212",
        currency: "EUR",
        currentValue: "1,529.81 EUR",
        totalChange: "-1.27% (-19.73 EUR)",
      },
    },
  },
  actions: {},
} as never);

export const advisorSystemPrompt = advisorCatalog.prompt({
  mode: "chat",
  customRules: [
    "Always produce a concise text explanation first, then a ```spec fenced JSONL UI spec.",
    "When user asks about a single stock/asset account, render exactly one StockCard component (single root element).",
    "Do not invent fields; derive values from the provided financial JSON context.",
    "Never use any component except StockCard.",
  ],
});
