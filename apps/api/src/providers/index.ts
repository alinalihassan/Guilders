import type { IProvider, ProviderName } from "./types";
import { SaltEdgeProvider } from "./saltedge/provider";
import { SnapTradeProvider } from "./snaptrade/provider";

export function getProvider(name: ProviderName): IProvider {
  switch (name) {
    case "SaltEdge":
      return new SaltEdgeProvider();
    case "SnapTrade":
      return new SnapTradeProvider();
    default:
      throw new Error(`Provider "${name}" not implemented`);
  }
}
