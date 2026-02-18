import { Elysia, t } from "elysia";
import { country, selectCountrySchema } from "../../db/schema/countries";
import { db } from "../../lib/db";
import { authPlugin } from "../../middleware/auth";

export const countryRoutes = new Elysia({ prefix: '/country' })
  .use(authPlugin)
  .model({
    Country: selectCountrySchema,
  })
  .get("", async () => {
    return await db.select().from(country);
  }, {
    auth: true,
    response: t.Array(t.Ref('#/components/schemas/Country')),
    detail: {
      summary: "Get all countries",
      description: "Retrieve a list of all countries with their ISO codes and names",
      tags: ["Countries"]
    }
  });
