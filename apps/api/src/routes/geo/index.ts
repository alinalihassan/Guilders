import { Hono } from "hono";
import { z } from "zod";

import { documented } from "../../lib/http";

const geoResponseSchema = z.object({
  country: z.string().length(2).nullable(),
});

export const geoRoutes = new Hono().get(
  "/",
  documented({
    tags: ["Geo"],
    summary: "Detect country from request",
    description:
      "Returns the ISO 3166-1 alpha-2 country inferred from the Cloudflare request edge. Tor (T1) is treated as unknown.",
    responses: { 200: geoResponseSchema },
  }),
  async (c) => {
    const cfCountry = (c.req.raw as Request & { cf?: { country?: string } }).cf?.country;
    const country =
      cfCountry && cfCountry.length === 2 && cfCountry !== "T1" ? cfCountry.toUpperCase() : null;
    return c.json({ country }, 200);
  },
);
