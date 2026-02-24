import { t } from "elysia";

export const currencyCodeParamSchema = t.Object({
  code: t.String({ minLength: 3, maxLength: 3 }),
});
