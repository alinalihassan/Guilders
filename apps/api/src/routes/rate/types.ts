import { t } from "elysia";

import type { Rate as DbRate } from "../../db/schema/rates";

export const rateQuerySchema = t.Object({
  base: t.Optional(t.String({ minLength: 3, maxLength: 3 })),
});

export const rateCodeParamSchema = t.Object({
  code: t.String({ minLength: 3, maxLength: 3 }),
});

export type Rate = DbRate;
export type Rates = Rate[];
