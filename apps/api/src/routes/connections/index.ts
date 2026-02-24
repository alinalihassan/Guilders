import { and, eq } from "drizzle-orm";
import { Elysia, status, t } from "elysia";
import { institutionConnection } from "../../db/schema/institution-connections";
import { providerConnection } from "../../db/schema/provider-connections";
import { db } from "../../lib/db";
import { authPlugin } from "../../middleware/auth";
import { getProvider } from "../../providers";
import { errorSchema } from "../../utils/error";

const connectionResultSchema = t.Object({
  redirectURI: t.String(),
  type: t.Union([t.Literal("redirect"), t.Literal("popup")]),
});

const providerOnlySchema = t.Object({
  provider_id: t.String(),
});

const createConnectionSchema = t.Object({
  provider_id: t.String(),
  institution_id: t.String(),
});

const reconnectSchema = t.Object({
  provider_id: t.String(),
  institution_id: t.String(),
  account_id: t.String(),
});

const refreshSchema = t.Object({
  provider_id: t.String(),
  connection_id: t.String(),
});

function parseId(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

export const connectionsRoutes = new Elysia({
  prefix: "/connections",
  detail: {
    tags: ["Connections"],
    security: [{ bearerAuth: [] }],
  },
})
  .use(authPlugin)
  .post(
    "",
    async ({ body, user }) => {
      const providerId = parseId(body.provider_id);
      const institutionId = parseId(body.institution_id);
      if (!providerId || !institutionId) {
        return status(400, { error: "Invalid provider_id or institution_id" });
      }

      const providerRecord = await db.query.provider.findFirst({
        where: { id: providerId },
      });
      if (!providerRecord) return status(404, { error: "Provider not found" });

      const institutionRecord = await db.query.institution.findFirst({
        where: { id: institutionId },
      });
      if (!institutionRecord)
        return status(404, { error: "Institution not found" });

      try {
        const provider = getProvider(providerRecord.name as "SaltEdge" | "SnapTrade");
        const result = await provider.connect({
          userId: user.id,
          institutionId: institutionRecord.id,
        });

        if (!result.success || !result.data?.redirectURI) {
          console.error("[Connections] create failed", {
            provider: providerRecord.name,
            userId: user.id,
            institutionId: institutionRecord.id,
            error: result.error,
          });
          return status(500, {
            error: result.error || "Failed to create connection",
          });
        }

        return result.data;
      } catch (error) {
        return status(500, {
          error:
            error instanceof Error ? error.message : "Failed to create connection",
        });
      }
    },
    {
      auth: true,
      body: createConnectionSchema,
      response: {
        200: connectionResultSchema,
        400: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
      detail: {
        summary: "Create provider connection",
        description: "Start provider connection flow for an institution",
      },
    },
  )
  .post(
    "/reconnect",
    async ({ body, user }) => {
      const providerId = parseId(body.provider_id);
      const institutionId = parseId(body.institution_id);
      const accountId = parseId(body.account_id);
      if (!providerId || !institutionId || !accountId) {
        return status(400, {
          error: "Invalid provider_id, institution_id or account_id",
        });
      }

      const providerRecord = await db.query.provider.findFirst({
        where: { id: providerId },
      });
      if (!providerRecord) return status(404, { error: "Provider not found" });

      const institutionRecord = await db.query.institution.findFirst({
        where: { id: institutionId },
      });
      if (!institutionRecord)
        return status(404, { error: "Institution not found" });

      const accountRecord = await db.query.account.findFirst({
        where: {
          id: accountId,
          user_id: user.id,
        },
      });
      if (!accountRecord?.institution_connection_id) {
        return status(404, {
          error: "No existing connection found for account",
        });
      }

      const existingConnection = await db.query.institutionConnection.findFirst({
        where: { id: accountRecord.institution_connection_id },
      });
      if (!existingConnection?.connection_id) {
        return status(404, { error: "No existing connection found" });
      }

      try {
        const provider = getProvider(providerRecord.name as "SaltEdge" | "SnapTrade");
        const result = await provider.reconnect({
          userId: user.id,
          institutionId: institutionRecord.id,
          connectionId: existingConnection.connection_id,
        });

        if (!result.success || !result.data?.redirectURI) {
          return status(500, {
            error: result.error || "Failed to reconnect connection",
          });
        }

        return result.data;
      } catch (error) {
        return status(500, {
          error:
            error instanceof Error
              ? error.message
              : "Failed to reconnect connection",
        });
      }
    },
    {
      auth: true,
      body: reconnectSchema,
      response: {
        200: connectionResultSchema,
        400: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
      detail: {
        summary: "Reconnect provider connection",
        description: "Start provider reconnect flow for an existing account",
      },
    },
  )
  .post(
    "/refresh",
    async ({ body, user }) => {
      const providerId = parseId(body.provider_id);
      const institutionConnectionId = parseId(body.connection_id);
      if (!providerId || !institutionConnectionId) {
        return status(400, { error: "Invalid provider_id or connection_id" });
      }

      const providerRecord = await db.query.provider.findFirst({
        where: { id: providerId },
      });
      if (!providerRecord) return status(404, { error: "Provider not found" });

      const providerConn = await db.query.providerConnection.findFirst({
        where: {
          provider_id: providerId,
          user_id: user.id,
        },
      });
      if (!providerConn) {
        return status(404, { error: "No existing provider connection found" });
      }

      const connectionRecord = await db.query.institutionConnection.findFirst({
        where: {
          id: institutionConnectionId,
          provider_connection_id: providerConn.id,
        },
      });
      if (!connectionRecord?.connection_id) {
        return status(404, { error: "Institution connection not found" });
      }

      try {
        const provider = getProvider(providerRecord.name as "SaltEdge" | "SnapTrade");
        const result = await provider.refreshConnection(connectionRecord.connection_id);
        if (!result.success) {
          return status(500, {
            error: result.error || "Failed to refresh connection",
          });
        }
        return { success: true };
      } catch (error) {
        return status(500, {
          error:
            error instanceof Error ? error.message : "Failed to refresh connection",
        });
      }
    },
    {
      auth: true,
      body: refreshSchema,
      response: {
        200: t.Object({ success: t.Boolean() }),
        400: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
      detail: {
        summary: "Refresh provider connection",
        description: "Trigger provider-side refresh for a linked institution",
      },
    },
  )
  .post(
    "/register",
    async ({ body, user }) => {
      const providerId = parseId(body.provider_id);
      if (!providerId) return status(400, { error: "Invalid provider_id" });

      const providerRecord = await db.query.provider.findFirst({
        where: { id: providerId },
      });
      if (!providerRecord) return status(404, { error: "Provider not found" });

      try {
        const provider = getProvider(providerRecord.name as "SaltEdge" | "SnapTrade");
        const result = await provider.registerUser(user.id);
        if (!result.success || !result.data?.userSecret) {
          console.error("[Connections] register failed", {
            provider: providerRecord.name,
            userId: user.id,
            error: result.error,
          });
          return status(500, {
            error: result.error || "Failed to register with provider",
          });
        }

        const existing = await db.query.providerConnection.findFirst({
          where: { user_id: user.id, provider_id: providerId },
        });

        if (existing) {
          await db
            .update(providerConnection)
            .set({ secret: result.data.userSecret })
            .where(eq(providerConnection.id, existing.id));
        } else {
          await db.insert(providerConnection).values({
            user_id: user.id,
            provider_id: providerId,
            secret: result.data.userSecret,
          });
        }

        return { secret: result.data.userSecret };
      } catch (error) {
        return status(500, {
          error:
            error instanceof Error ? error.message : "Failed to register provider",
        });
      }
    },
    {
      auth: true,
      body: providerOnlySchema,
      response: {
        200: t.Object({ secret: t.String() }),
        400: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
      detail: {
        summary: "Register provider user",
        description: "Create or update provider user secret for the current user",
      },
    },
  )
  .post(
    "/deregister",
    async ({ body, user }) => {
      const providerId = parseId(body.provider_id);
      if (!providerId) return status(400, { error: "Invalid provider_id" });

      const providerRecord = await db.query.provider.findFirst({
        where: { id: providerId },
      });
      if (!providerRecord) return status(404, { error: "Provider not found" });

      const existing = await db.query.providerConnection.findFirst({
        where: {
          user_id: user.id,
          provider_id: providerId,
        },
      });
      if (!existing) return { success: true };

      try {
        const provider = getProvider(providerRecord.name as "SaltEdge" | "SnapTrade");
        const result = await provider.deregisterUser(user.id);
        if (!result.success) {
          return status(500, {
            error: result.error || "Failed to deregister provider user",
          });
        }

        await db
          .delete(institutionConnection)
          .where(eq(institutionConnection.provider_connection_id, existing.id));

        await db
          .delete(providerConnection)
          .where(
            and(
              eq(providerConnection.provider_id, providerId),
              eq(providerConnection.user_id, user.id),
            ),
          );

        return { success: true };
      } catch (error) {
        return status(500, {
          error:
            error instanceof Error
              ? error.message
              : "Failed to deregister provider user",
        });
      }
    },
    {
      auth: true,
      body: providerOnlySchema,
      response: {
        200: t.Object({ success: t.Boolean() }),
        400: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
      detail: {
        summary: "Deregister provider user",
        description: "Remove provider user and local connection records",
      },
    },
  );
