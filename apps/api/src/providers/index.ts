import type { IProvider, ProviderName } from "./types";

export function getProvider(name: ProviderName): IProvider {
  switch (name) {
    default:
      throw new Error(`Provider "${name}" not implemented`);
  }
}
