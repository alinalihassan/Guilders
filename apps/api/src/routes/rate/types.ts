import { t } from "elysia";

export const rateQuerySchema = t.Object({
  base: t.Optional(t.String({ minLength: 3, maxLength: 3 })),
});

export const rateCodeParamSchema = t.Object({
  code: t.String({ minLength: 3, maxLength: 3 }),
});
