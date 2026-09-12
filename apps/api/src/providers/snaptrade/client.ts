import { Snaptrade, SnaptradeAuth } from "snaptrade-typescript-sdk";

export type SnapTradeConfig = {
  clientId: string;
  consumerKey: string;
};

export type SnapTradeClient = Snaptrade<ReturnType<typeof SnaptradeAuth.commercialApiKey>>;

export function getSnapTradeConfig(): SnapTradeConfig | null {
  const clientId = process.env.SNAPTRADE_CLIENT_ID;
  const consumerKey = process.env.SNAPTRADE_CLIENT_SECRET;
  if (!clientId || !consumerKey) return null;
  return { clientId, consumerKey };
}

export function getSnapTradeClient(): SnapTradeClient | null {
  const config = getSnapTradeConfig();
  return config
    ? new Snaptrade({
        auth: SnaptradeAuth.commercialApiKey(config),
      })
    : null;
}
