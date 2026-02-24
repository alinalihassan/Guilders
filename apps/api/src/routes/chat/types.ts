import { t } from "elysia";

// Serializable JSON shape for user financial data
export interface FinancialDataJson {
  netWorth: number;
  primaryCurrency: string;
  accounts: Array<{
    id: number;
    name: string;
    type: string;
    subtype: string;
    image?: string;
    value: string;
    currency: string;
    cost?: string;
    institution?: string;
  }>;
  transactions: Array<{
    accountId: number;
    accountName?: string;
    date: string;
    amount: string;
    currency: string;
    category: string;
    description: string;
  }>;
  exchangeRates: Array<{ currencyCode: string; rate: string }>;
}

export interface FinancialContext {
  prompt: string;
  data: FinancialDataJson;
}

export interface ToFinancialDataJsonParams {
  accounts: Array<{
    id: number;
    name: string;
    type: string;
    subtype: string;
    image?: string | null;
    value: string | number;
    currency: string;
    cost?: string | number | null;
    institutionConnection?: {
      institution?: { name: string } | null;
    } | null;
  }>;
  transactions: Array<{
    account_id: number;
    date: string;
    amount: string | number;
    currency: string;
    category: string;
    description: string;
  }>;
  exchangeRates: Array<{ currency_code: string; rate: string | number }>;
  netWorth: number;
  primaryCurrency: string;
}

// Standalone system prompt - pure text, no data interpolation
export const FINANCIAL_ADVISOR_PROMPT = `You are a helpful financial advisor assistant. You have access to the user's financial data (provided as JSON below) and can provide personalized advice and insights.

Use the financial data and exchange rates to provide personalized advice when relevant.
Consider exchange rates when discussing amounts in different currencies.
Be concise, helpful, and professional in your responses. If you don't have enough information to answer a specific question, say so clearly.`;

// Schemas for request validation (runtime) - matches UIMessage shape from useChat
const uiPartSchema = t.Object({
  type: t.String(),
  text: t.Optional(t.String()),
});

const uiMessageSchema = t.Object({
  id: t.Optional(t.String()),
  role: t.Union([t.Literal("user"), t.Literal("assistant"), t.Literal("system")]),
  parts: t.Array(uiPartSchema),
});

export const chatRequestSchema = t.Object({
  messages: t.Array(uiMessageSchema),
});
