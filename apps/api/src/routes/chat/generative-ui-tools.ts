import { jsonSchema, tool } from "ai";

/**
 * Generative UI tools: they are exposed as tools to the model but their main effect
 * is to trigger a specific UI component (e.g. stock card) in the chat client.
 */

const SHOW_STOCK_CARD_DESCRIPTION =
  "Render a stock account summary card in the UI when the user asks about a single stock account/asset. Call get_accounts first, then use the account data to populate this card. Do not use for non-stock requests.";

export const showStockCard = tool({
  description: SHOW_STOCK_CARD_DESCRIPTION,
  inputSchema: jsonSchema({
    type: "object",
    properties: {
      accountId: { type: "number" },
      subtype: { type: ["string", "null"] },
      image: { type: ["string", "null"] },
      symbol: { type: "string" },
      accountName: { type: "string" },
      currency: { type: "string" },
      value: { type: "number" },
      cost: { type: ["number", "null"] },
      currentValue: { type: ["string", "null"] },
      totalChange: { type: ["string", "null"] },
    },
    required: ["accountId", "symbol", "accountName", "currency", "value"],
    additionalProperties: false,
  }),
  execute: async (input) => input,
});

/** Tool name and description for prompt injection (generative UI tools are not in MCP). */
export const GENERATIVE_UI_TOOLS_OVERVIEW: Array<{ name: string; description: string }> = [
  { name: "showStockCard", description: SHOW_STOCK_CARD_DESCRIPTION },
];
