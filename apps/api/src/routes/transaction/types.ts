import { t } from "elysia";

export const transactionQuerySchema = t.Object({
  accountId: t.Optional(t.Number()),
});

export const transactionIdParamSchema = t.Object({
  id: t.Number(),
});
