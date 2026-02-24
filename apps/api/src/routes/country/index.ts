import { Elysia, t } from "elysia";

import { selectCountrySchema } from "../../db/schema/countries";
import { db } from "../../lib/db";
import { authPlugin } from "../../middleware/auth";

export const countryRoutes = new Elysia({
  prefix: "/country",
  detail: {
    tags: ["Countries"],
    security: [{ bearerAuth: [] }],
  },
})
  .use(authPlugin)
  .model({
    Country: selectCountrySchema,
  })
  .get(
    "",
    async () => {
      return db.query.country.findMany();
    },
    {
      auth: true,
      response: t.Array(t.Ref("#/components/schemas/Country")),
      detail: {
        summary: "Get all countries",
        description: "Retrieve a list of all countries with their ISO codes and names",
      },
    },
  );
