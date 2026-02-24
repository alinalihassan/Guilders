import { and, eq, inArray } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { institutionConnection, selectInstitutionConnectionSchema } from "../../db/schema/institution-connections";
import { institution } from "../../db/schema/institutions";
import { providerConnection } from "../../db/schema/provider-connections";
import { db } from "../../lib/db";
import { authPlugin } from "../../middleware/auth";
import {
  institutionConnectionIdParamSchema,
  institutionConnectionWithRelationsSchema,
} from "./types";

export const institutionConnectionRoutes = new Elysia({
  prefix: "/institution-connection",
})
  .use(authPlugin)
  .model({
    InstitutionConnection: selectInstitutionConnectionSchema,
  })
  .get(
    "",
    async ({ user }) => {
      // First get user's provider connections
      const userProviderConnections = await db
        .query.providerConnection.findMany({
          where: {
            user_id: user.id,
          },
        });

      const providerConnectionIds = userProviderConnections.map((pc) => pc.id);

      if (providerConnectionIds.length === 0) {
        return [];
      }

      // Get institution connections for these provider connections
      const connections = await db
        .select({
          institutionConnection: institutionConnection,
          institution: institution,
          provider_connection: providerConnection,
        })
        .from(institutionConnection)
        .innerJoin(
          institution,
          eq(institutionConnection.institution_id, institution.id),
        )
        .leftJoin(
          providerConnection,
          eq(
            institutionConnection.provider_connection_id,
            providerConnection.id,
          ),
        )
        .where(
          inArray(
            institutionConnection.provider_connection_id,
            providerConnectionIds,
          ),
        );

      return connections.map((c) => ({
        id: c.institutionConnection.id,
        institution_id: c.institutionConnection.institution_id,
        provider_connection_id: c.institutionConnection.provider_connection_id,
        connection_id: c.institutionConnection.connection_id,
        broken: c.institutionConnection.broken,
        created_at: c.institutionConnection.created_at,
        institution: c.institution,
        provider_connection: c.provider_connection,
      }));
    },
    {
      auth: true,
      response: t.Array(institutionConnectionWithRelationsSchema),
      detail: {
        summary: "Get all institution connections",
        description:
          "Retrieve all institution connections for the authenticated user with institution and provider details",
        tags: ["Institution Connections"],
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get(
    "/:id",
    async ({ params, user }) => {
      // First get user's provider connections
      const userProviderConnections = await db
        .query.providerConnection.findMany({
          where: {
            user_id: user.id,
          },
        });

      const providerConnectionIds = userProviderConnections.map((pc) => pc.id);

      if (providerConnectionIds.length === 0) {
        throw new Error("Institution connection not found");
      }

      // Get specific institution connection
      const result = await db
        .select({
          institutionConnection: institutionConnection,
          institution: institution,
          provider_connection: providerConnection,
        })
        .from(institutionConnection)
        .innerJoin(
          institution,
          eq(institutionConnection.institution_id, institution.id),
        )
        .leftJoin(
          providerConnection,
          eq(
            institutionConnection.provider_connection_id,
            providerConnection.id,
          ),
        )
        .where(
          and(
            eq(institutionConnection.id, params.id),
            inArray(
              institutionConnection.provider_connection_id,
              providerConnectionIds,
            ),
          ),
        );

      if (result.length === 0 || !result[0]) {
        throw new Error("Institution connection not found");
      }

      const c = result[0];

      return {
        id: c.institutionConnection.id,
        institution_id: c.institutionConnection.institution_id,
        provider_connection_id: c.institutionConnection.provider_connection_id,
        connection_id: c.institutionConnection.connection_id,
        broken: c.institutionConnection.broken,
        created_at: c.institutionConnection.created_at,
        institution: c.institution,
        provider_connection: c.provider_connection,
      };
    },
    {
      auth: true,
      params: institutionConnectionIdParamSchema,
      response: institutionConnectionWithRelationsSchema,
      detail: {
        summary: "Get institution connection by ID",
        description:
          "Retrieve a specific institution connection by its ID with details",
        tags: ["Institution Connections"],
        security: [{ bearerAuth: [] }],
      },
    },
  );
