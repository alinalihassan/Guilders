import { and, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { institutionConnection } from "../../db/schema/institution-connections";
import { institution } from "../../db/schema/institutions";
import { providerConnection } from "../../db/schema/provider-connections";
import { documented, idParamSchema, jsonError, validate } from "../../lib/http";
import { requireAuth, type AuthEnv } from "../../middleware/auth";
import { errorSchema } from "../../utils/error";
import { institutionConnectionWithRelationsSchema } from "./types";

export const institutionConnectionRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .get(
    "/",
    documented({
      tags: ["Institution Connections"],
      summary: "Get all institution connections",
      description:
        "Retrieve all institution connections for the authenticated user with institution and provider details",
      responses: { 200: z.array(institutionConnectionWithRelationsSchema) },
    }),
    async (c) => {
      const user = c.get("user");
      const db = c.get("db");

      const userProviderConnections = await db.query.providerConnection.findMany({
        where: { user_id: user.id },
      });

      const providerConnectionIds = userProviderConnections.map((pc) => pc.id);

      if (providerConnectionIds.length === 0) {
        return c.json([], 200);
      }

      const connections = await db
        .select({
          institutionConnection: institutionConnection,
          institution: institution,
          provider_connection: providerConnection,
        })
        .from(institutionConnection)
        .innerJoin(institution, eq(institutionConnection.institution_id, institution.id))
        .leftJoin(
          providerConnection,
          eq(institutionConnection.provider_connection_id, providerConnection.id),
        )
        .where(inArray(institutionConnection.provider_connection_id, providerConnectionIds));

      return c.json(
        connections.map((row) => ({
          id: row.institutionConnection.id,
          institution_id: row.institutionConnection.institution_id,
          provider_connection_id: row.institutionConnection.provider_connection_id,
          connection_id: row.institutionConnection.connection_id,
          broken: row.institutionConnection.broken,
          created_at: row.institutionConnection.created_at,
          institution: row.institution,
          provider_connection: row.provider_connection,
        })),
        200,
      );
    },
  )
  .get(
    "/:id",
    documented({
      tags: ["Institution Connections"],
      summary: "Get institution connection by ID",
      description: "Retrieve a specific institution connection by its ID with details",
      responses: { 200: institutionConnectionWithRelationsSchema, 404: errorSchema },
    }),
    validate("param", idParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const user = c.get("user");
      const db = c.get("db");

      const userProviderConnections = await db.query.providerConnection.findMany({
        where: { user_id: user.id },
      });

      const providerConnectionIds = userProviderConnections.map((pc) => pc.id);

      if (providerConnectionIds.length === 0) {
        return jsonError(c, 404, "Institution connection not found");
      }

      const result = await db
        .select({
          institutionConnection: institutionConnection,
          institution: institution,
          provider_connection: providerConnection,
        })
        .from(institutionConnection)
        .innerJoin(institution, eq(institutionConnection.institution_id, institution.id))
        .leftJoin(
          providerConnection,
          eq(institutionConnection.provider_connection_id, providerConnection.id),
        )
        .where(
          and(
            eq(institutionConnection.id, id),
            inArray(institutionConnection.provider_connection_id, providerConnectionIds),
          ),
        );

      if (result.length === 0 || !result[0]) {
        return jsonError(c, 404, "Institution connection not found");
      }

      const row = result[0];

      return c.json(
        {
          id: row.institutionConnection.id,
          institution_id: row.institutionConnection.institution_id,
          provider_connection_id: row.institutionConnection.provider_connection_id,
          connection_id: row.institutionConnection.connection_id,
          broken: row.institutionConnection.broken,
          created_at: row.institutionConnection.created_at,
          institution: row.institution,
          provider_connection: row.provider_connection,
        },
        200,
      );
    },
  );
