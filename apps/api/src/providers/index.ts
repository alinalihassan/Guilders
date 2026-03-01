import { EnableBankingProvider } from "./enablebanking/provider";
import { SnapTradeProvider } from "./snaptrade/provider";
import { TellerProvider } from "./teller/provider";
import type { IProvider, ProviderName } from "./types";

export function getProvider(name: ProviderName): IProvider {
  switch (name) {
    case "EnableBanking":
      return new EnableBankingProvider();
    case "SnapTrade":
      return new SnapTradeProvider();
    case "Teller":
      return new TellerProvider();
    default:
      throw new Error(`Provider "${name}" not implemented`);
  }
}
