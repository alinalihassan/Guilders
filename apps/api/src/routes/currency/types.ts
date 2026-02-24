import { t } from "elysia";
import type { Currency as DbCurrency } from "../../db/schema/currencies";

export const currencyCodeParamSchema = t.Object({
  code: t.String({ minLength: 3, maxLength: 3 }),
});

export type Currency = DbCurrency;
export type Currencies = Currency[];
