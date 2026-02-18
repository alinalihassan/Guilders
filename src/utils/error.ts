import { t } from "elysia";

export const errorSchema = t.Object({
  error: t.String(),
});