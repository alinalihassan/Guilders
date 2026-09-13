import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { institutionConnection } from "../../db/schema/institution-connections";
import { providerConnection } from "../../db/schema/provider-connections";
import { cleanupInstitutionConnectionDocuments } from "../../lib/cleanup-documents";
import { documented, jsonError, successSchema, validate } from "../../lib/http";
import { syncAccountData } from "../../lib/sync-connection-data";
import { requireAuth, type AuthEnv } from "../../middleware/auth";
import { getProvider } from "../../providers";
import { connectLunchFlow, isInvalidLunchFlowKey } from "../../providers/lunchflow/connect";
import { API_KEY_PROVIDERS, type ProviderName } from "../../providers/types";
import { errorSchema } from "../../utils/error";
import {
  apiKeyConnectionResultSchema,
  apiKeyConnectionSchema,
  connectionResultSchema,
  createConnectionSchema,
  providerOnlySchema,
  reconnectSchema,
  refreshResultSchema,
  refreshSchema,
  syncSchema,
} from "./types";
import { parseId } from "./utils";

export const connectionsRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .post(
    "/",
    documented({
      tags: ["Connections"],
      summary: "Create provider connection",
      description: "Start provider connection flow for an institution",
      responses: {
        200: connectionResultSchema,
        400: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
    }),
    validate("json", createConnectionSchema),
    async (c) => {
      const body = c.req.valid("json");
      const user = c.get("user");
      const db = c.get("db");

      const providerId = parseId(body.provider_id);
      const institutionId = parseId(body.institution_id);
      if (!providerId || !institutionId) {
        return jsonError(c, 400, "Invalid provider_id or institution_id");
      }

      const providerRecord = await db.query.provider.findFirst({
        where: { id: providerId },
      });
      if (!providerRecord) return jsonError(c, 404, "Provider not found");

      const institutionRecord = await db.query.institution.findFirst({
        where: { id: institutionId },
      });
      if (!institutionRecord) return jsonError(c, 404, "Institution not found");

      try {
        const provider = getProvider(providerRecord.name as ProviderName);
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
          return jsonError(c, 500, result.error || "Failed to create connection");
        }

        return c.json(result.data, 200);
      } catch (error) {
        return jsonError(
          c,
          500,
          error instanceof Error ? error.message : "Failed to create connection",
        );
      }
    },
  )
  .post(
    "/reconnect",
    documented({
      tags: ["Connections"],
      summary: "Reconnect provider connection",
      description: "Start provider reconnect flow for an existing account",
      responses: {
        200: connectionResultSchema,
        400: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
    }),
    validate("json", reconnectSchema),
    async (c) => {
      const body = c.req.valid("json");
      const user = c.get("user");
      const db = c.get("db");

      const providerId = parseId(body.provider_id);
      const institutionId = parseId(body.institution_id);
      const accountId = parseId(body.account_id);
      if (!providerId || !institutionId || !accountId) {
        return jsonError(c, 400, "Invalid provider_id, institution_id or account_id");
      }

      const providerRecord = await db.query.provider.findFirst({
        where: { id: providerId },
      });
      if (!providerRecord) return jsonError(c, 404, "Provider not found");

      const institutionRecord = await db.query.institution.findFirst({
        where: { id: institutionId },
      });
      if (!institutionRecord) return jsonError(c, 404, "Institution not found");

      const accountRecord = await db.query.account.findFirst({
        where: {
          id: accountId,
          user_id: user.id,
        },
      });
      if (!accountRecord?.institution_connection_id) {
        return jsonError(c, 404, "No existing connection found for account");
      }

      const existingConnection = await db.query.institutionConnection.findFirst({
        where: { id: accountRecord.institution_connection_id },
      });
      if (!existingConnection?.connection_id) {
        return jsonError(c, 404, "No existing connection found");
      }

      try {
        const provider = getProvider(providerRecord.name as ProviderName);
        const result = await provider.reconnect({
          userId: user.id,
          institutionId: institutionRecord.id,
          connectionId: existingConnection.connection_id,
        });

        if (!result.success || !result.data?.redirectURI) {
          return jsonError(c, 500, result.error || "Failed to reconnect connection");
        }

        return c.json(result.data, 200);
      } catch (error) {
        return jsonError(
          c,
          500,
          error instanceof Error ? error.message : "Failed to reconnect connection",
        );
      }
    },
  )
  .post(
    "/refresh",
    documented({
      tags: ["Connections"],
      summary: "Refresh provider connection",
      description:
        "Trigger provider-side auth refresh. May return a redirectURI for re-authentication.",
      responses: { 200: refreshResultSchema, 400: errorSchema, 404: errorSchema, 500: errorSchema },
    }),
    validate("json", refreshSchema),
    async (c) => {
      const body = c.req.valid("json");
      const user = c.get("user");
      const db = c.get("db");

      const providerId = parseId(body.provider_id);
      const institutionConnectionId = parseId(body.connection_id);
      if (!providerId || !institutionConnectionId) {
        return jsonError(c, 400, "Invalid provider_id or connection_id");
      }

      const providerRecord = await db.query.provider.findFirst({
        where: { id: providerId },
      });
      if (!providerRecord) return jsonError(c, 404, "Provider not found");

      const providerConn = await db.query.providerConnection.findFirst({
        where: {
          provider_id: providerId,
          user_id: user.id,
        },
      });
      if (!providerConn) {
        return jsonError(c, 404, "No existing provider connection found");
      }

      const connectionRecord = await db.query.institutionConnection.findFirst({
        where: {
          id: institutionConnectionId,
          provider_connection_id: providerConn.id,
        },
      });
      if (!connectionRecord?.connection_id) {
        return jsonError(c, 404, "Institution connection not found");
      }

      try {
        const provider = getProvider(providerRecord.name as ProviderName);
        const result = await provider.refreshConnection(connectionRecord.connection_id);
        if (!result.success) {
          return jsonError(c, 500, result.error || "Failed to refresh connection");
        }
        return c.json(
          {
            success: true,
            redirectURI: result.data?.redirectURI,
            type: result.data?.type,
          },
          200,
        );
      } catch (error) {
        return jsonError(
          c,
          500,
          error instanceof Error ? error.message : "Failed to refresh connection",
        );
      }
    },
  )
  .post(
    "/register",
    documented({
      tags: ["Connections"],
      summary: "Register provider user",
      description: "Create or update provider user secret for the current user",
      responses: {
        200: z.object({ secret: z.string() }),
        400: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
    }),
    validate("json", providerOnlySchema),
    async (c) => {
      const body = c.req.valid("json");
      const user = c.get("user");
      const db = c.get("db");

      const providerId = parseId(body.provider_id);
      if (!providerId) return jsonError(c, 400, "Invalid provider_id");

      const providerRecord = await db.query.provider.findFirst({
        where: { id: providerId },
      });
      if (!providerRecord) return jsonError(c, 404, "Provider not found");

      try {
        const provider = getProvider(providerRecord.name as ProviderName);
        const result = await provider.registerUser(user.id);
        if (!result.success || !result.data?.userSecret) {
          console.error("[Connections] register failed", {
            provider: providerRecord.name,
            userId: user.id,
            error: result.error,
          });
          return jsonError(c, 500, result.error || "Failed to register with provider");
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

        return c.json({ secret: result.data.userSecret }, 200);
      } catch (error) {
        return jsonError(
          c,
          500,
          error instanceof Error ? error.message : "Failed to register provider",
        );
      }
    },
  )
  .post(
    "/deregister",
    documented({
      tags: ["Connections"],
      summary: "Deregister provider user",
      description: "Remove provider user and local connection records",
      responses: { 200: successSchema, 400: errorSchema, 404: errorSchema, 500: errorSchema },
    }),
    validate("json", providerOnlySchema),
    async (c) => {
      const body = c.req.valid("json");
      const user = c.get("user");
      const db = c.get("db");

      const providerId = parseId(body.provider_id);
      if (!providerId) return jsonError(c, 400, "Invalid provider_id");

      const providerRecord = await db.query.provider.findFirst({
        where: { id: providerId },
      });
      if (!providerRecord) return jsonError(c, 404, "Provider not found");

      const existing = await db.query.providerConnection.findFirst({
        where: {
          user_id: user.id,
          provider_id: providerId,
        },
      });
      if (!existing) return c.json({ success: true }, 200);

      try {
        const provider = getProvider(providerRecord.name as ProviderName);
        const result = await provider.deregisterUser(user.id);
        if (!result.success) {
          return jsonError(c, 500, result.error || "Failed to deregister provider user");
        }

        const connectionsToDelete = await db.query.institutionConnection.findMany({
          where: { provider_connection_id: existing.id },
        });

        await Promise.all(
          connectionsToDelete.map((conn) => cleanupInstitutionConnectionDocuments(db, conn.id)),
        );

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

        return c.json({ success: true }, 200);
      } catch (error) {
        return jsonError(
          c,
          500,
          error instanceof Error ? error.message : "Failed to deregister provider user",
        );
      }
    },
  )
  .post(
    "/api-key",
    documented({
      tags: ["Connections"],
      summary: "Connect with a personal API key",
      description: "Save a Lunch Flow API key and import accounts from that destination",
      responses: {
        200: apiKeyConnectionResultSchema,
        400: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
    }),
    validate("json", apiKeyConnectionSchema),
    async (c) => {
      const body = c.req.valid("json");
      const user = c.get("user");
      const db = c.get("db");

      const providerId = parseId(body.provider_id);
      if (!providerId) return jsonError(c, 400, "Invalid provider_id");

      const providerRecord = await db.query.provider.findFirst({
        where: { id: providerId },
      });
      if (!providerRecord) return jsonError(c, 404, "Provider not found");
      if (!API_KEY_PROVIDERS.includes(providerRecord.name as ProviderName)) {
        return jsonError(c, 400, "This provider does not accept an API key");
      }

      try {
        const result = await connectLunchFlow({
          userId: user.id,
          providerId: providerRecord.id,
          apiKey: body.api_key,
          fallbackLogoUrl: providerRecord.logo_url,
        });
        return c.json({ success: true, ...result }, 200);
      } catch (error) {
        if (isInvalidLunchFlowKey(error)) {
          return jsonError(c, 400, "Invalid Lunch Flow API key");
        }
        return jsonError(
          c,
          500,
          error instanceof Error ? error.message : "Failed to connect Lunch Flow",
        );
      }
    },
  )
  .post(
    "/sync",
    documented({
      tags: ["Connections"],
      summary: "Sync account data",
      description: "Pull latest balance and transactions for a single account",
      responses: { 200: successSchema, 400: errorSchema, 404: errorSchema, 500: errorSchema },
    }),
    validate("json", syncSchema),
    async (c) => {
      const body = c.req.valid("json");
      const user = c.get("user");
      const db = c.get("db");

      const accountId = parseId(body.account_id);
      if (!accountId) {
        return jsonError(c, 400, "Invalid account_id");
      }

      const accountRecord = await db.query.account.findFirst({
        where: { id: accountId, user_id: user.id },
      });
      if (!accountRecord?.institution_connection_id) {
        return jsonError(c, 404, "Synced account not found");
      }

      try {
        await syncAccountData(accountId);
        return c.json({ success: true }, 200);
      } catch (error) {
        return jsonError(
          c,
          500,
          error instanceof Error ? error.message : "Failed to sync account data",
        );
      }
    },
  );
