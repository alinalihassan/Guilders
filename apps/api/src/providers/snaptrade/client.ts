import { Snaptrade } from "snaptrade-typescript-sdk";

type SnapTradeConfig = {
  clientId: string;
  consumerKey: string;
};

function getSnapTradeConfig(): SnapTradeConfig {
  const clientId = process.env.SNAPTRADE_CLIENT_ID;
  const consumerKey = process.env.SNAPTRADE_CLIENT_SECRET;

  if (!clientId || !consumerKey) {
    throw new Error("Missing SNAPTRADE_CLIENT_ID or SNAPTRADE_CLIENT_SECRET env vars");
  }

  return { clientId, consumerKey };
}

export function getSnapTradeClient(): Snaptrade {
  const config = getSnapTradeConfig();
  return new Snaptrade(config);
}
