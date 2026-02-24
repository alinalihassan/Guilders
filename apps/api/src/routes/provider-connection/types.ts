import { t } from "elysia";
import type { ProviderConnection as DbProviderConnection } from "../../db/schema/provider-connections";

export const providerConnectionIdParamSchema = t.Object({
  id: t.Number(),
});

export type ProviderConnection = DbProviderConnection;
export type ProviderConnections = ProviderConnection[];
