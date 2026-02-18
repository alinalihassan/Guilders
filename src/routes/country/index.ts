import { Elysia, t } from "elysia";
import { selectCountrySchema } from "../../db/schema/countries";
import { db } from "../../lib/db";
import { authPlugin } from "../../middleware/auth";

export const countryRoutes = new Elysia({ prefix: '/country' })
  .use(authPlugin)
  .model({
    Country: selectCountrySchema,
  })
  .get("", async () => {
    return db.query.country.findMany();
  }, {
    auth: true,
    response: t.Array(t.Ref('#/components/schemas/Country')),
    detail: {
      summary: "Get all countries",
      description: "Retrieve a list of all countries with their ISO codes and names",
      tags: ["Countries"],
      security: [{ bearerAuth: [] }]
    }
  });
