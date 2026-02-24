import { t } from "elysia";
import type { Provider as DbProvider } from "../../db/schema/providers";

export const providerIdParamSchema = t.Object({
  id: t.Number(),
});

export type Provider = DbProvider;
export type Providers = Provider[];
