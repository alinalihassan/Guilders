import { t } from "elysia";

export const providerConnectionIdParamSchema = t.Object({
  id: t.Number(),
});
