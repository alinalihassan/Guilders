import { Hono } from "hono";
import { z } from "zod";

import { selectCurrencySchema } from "../../db/schema/currencies";
import { codeParamSchema, documented, jsonError, validate } from "../../lib/http";
import { requireAuth, type AuthEnv } from "../../middleware/auth";
import { errorSchema } from "../../utils/error";

export const currencyRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .get(
    "/",
    documented({
      tags: ["Currencies"],
      summary: "Get all currencies",
      description: "Retrieve a list of all supported currencies",
      responses: { 200: z.array(selectCurrencySchema) },
    }),
    async (c) => {
      const db = c.get("db");
      return c.json(await db.query.currency.findMany(), 200);
    },
  )
  .get(
    "/:code",
    documented({
      tags: ["Currencies"],
      summary: "Get currency by code",
      description: "Retrieve a specific currency by its ISO code",
      responses: { 200: selectCurrencySchema, 404: errorSchema },
    }),
    validate("param", codeParamSchema),
    async (c) => {
      const { code } = c.req.valid("param");
      const db = c.get("db");
      const result = await db.query.currency.findFirst({
        where: { code },
      });
      if (!result) {
        return jsonError(c, 404, "Currency not found");
      }
      return c.json(result, 200);
    },
  );
