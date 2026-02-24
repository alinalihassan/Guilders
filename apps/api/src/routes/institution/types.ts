import { t } from "elysia";

export const institutionIdParamSchema = t.Object({
  id: t.Number(),
});
