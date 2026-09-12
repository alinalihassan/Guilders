import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { document } from "../../db/schema/documents";
import type { DocumentEntityTypeEnum } from "../../db/schema/enums";
import type { Database } from "../../lib/db";
import { documented, idParamSchema, jsonError, successSchema, validate } from "../../lib/http";
import { requireAuth, type AuthEnv } from "../../middleware/auth";
import { errorSchema } from "../../utils/error";
import {
  createDocumentSchema,
  documentQuerySchema,
  getExtension,
  sanitizeFilenameForDisposition,
  selectDocumentSchema,
  validateFile,
} from "./types";

async function verifyEntityOwnership(
  db: Database,
  userId: string,
  entityType: "account" | "transaction" | "merchant",
  entityId: number,
): Promise<boolean> {
  if (entityType === "account") {
    const result = await db.query.account.findFirst({
      where: { id: entityId, user_id: userId },
    });
    return !!result;
  }
  if (entityType === "merchant") {
    const result = await db.query.merchant.findFirst({
      where: { id: entityId, user_id: userId },
    });
    return !!result;
  }
  const result = await db.query.transaction.findFirst({
    where: { id: entityId, account: { user_id: userId } },
  });
  return !!result;
}

export const documentRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .get(
    "/",
    documented({
      tags: ["Documents"],
      summary: "List documents",
      description:
        "List documents for the authenticated user, optionally filtered by entity type and ID",
      responses: { 200: z.array(selectDocumentSchema) },
    }),
    validate("query", documentQuerySchema),
    async (c) => {
      const query = c.req.valid("query");
      const user = c.get("user");
      const db = c.get("db");
      const conditions = [eq(document.user_id, user.id)];

      if (query.entity_type) {
        conditions.push(eq(document.entity_type, query.entity_type as DocumentEntityTypeEnum));
      }
      if (query.entity_id) {
        conditions.push(eq(document.entity_id, query.entity_id));
      }

      return c.json(
        await db
          .select()
          .from(document)
          .where(and(...conditions)),
        200,
      );
    },
  )
  .post(
    "/",
    documented({
      tags: ["Documents"],
      summary: "Upload document",
      description:
        "Upload a file (JPEG, PNG, WebP, HEIC, PDF; max 10MB) and attach it to an account, transaction, or merchant",
      responses: {
        200: selectDocumentSchema,
        400: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
    }),
    validate("form", createDocumentSchema),
    async (c) => {
      const body = c.req.valid("form");
      const user = c.get("user");
      const db = c.get("db");

      const validationError = validateFile(body.file);
      if (validationError) {
        return jsonError(c, 400, validationError);
      }

      const ownsEntity = await verifyEntityOwnership(db, user.id, body.entity_type, body.entity_id);
      if (!ownsEntity) {
        return jsonError(
          c,
          404,
          `${body.entity_type === "account" ? "Account" : body.entity_type === "merchant" ? "Merchant" : "Transaction"} not found`,
        );
      }

      const ext = getExtension(body.file);
      const uuid = crypto.randomUUID();
      const r2Key = `${user.id}/${body.entity_type}/${body.entity_id}/${uuid}.${ext}`;

      const arrayBuffer = await body.file.arrayBuffer();
      await env.USER_BUCKET.put(r2Key, arrayBuffer, {
        httpMetadata: { contentType: body.file.type },
      });

      let doc;
      try {
        [doc] = await db
          .insert(document)
          .values({
            user_id: user.id,
            entity_type: body.entity_type as DocumentEntityTypeEnum,
            entity_id: body.entity_id,
            name: body.file.name || `${uuid}.${ext}`,
            path: r2Key,
            size: body.file.size,
            type: body.file.type,
          })
          .returning();
      } catch {
        await env.USER_BUCKET.delete(r2Key);
        return jsonError(c, 500, "Failed to create document record");
      }

      if (!doc) {
        await env.USER_BUCKET.delete(r2Key);
        return jsonError(c, 500, "Failed to create document record");
      }

      return c.json(doc, 200);
    },
  )
  .get(
    "/:id/file",
    documented({
      tags: ["Documents"],
      summary: "Download document file",
      description: "Stream the document file content from storage",
      responses: { 404: errorSchema },
    }),
    validate("param", idParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const user = c.get("user");
      const db = c.get("db");

      const doc = await db
        .select()
        .from(document)
        .where(and(eq(document.id, id), eq(document.user_id, user.id)))
        .limit(1);

      if (!doc[0]) {
        return jsonError(c, 404, "Document not found");
      }

      const object = await env.USER_BUCKET.get(doc[0].path);
      if (!object) {
        return jsonError(c, 404, "File not found in storage");
      }

      const { safe: safeName, encoded: encodedName } = sanitizeFilenameForDisposition(doc[0].name);
      return new Response(object.body, {
        headers: {
          "content-type": doc[0].type,
          "content-disposition": `inline; filename="${safeName}"; filename*=UTF-8''${encodedName}`,
          "cache-control": "private, max-age=3600",
        },
      });
    },
  )
  .get(
    "/:id",
    documented({
      tags: ["Documents"],
      summary: "Get document metadata",
      description: "Retrieve metadata for a specific document",
      responses: { 200: selectDocumentSchema, 404: errorSchema },
    }),
    validate("param", idParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const user = c.get("user");
      const db = c.get("db");

      const doc = await db
        .select()
        .from(document)
        .where(and(eq(document.id, id), eq(document.user_id, user.id)))
        .limit(1);

      if (!doc[0]) {
        return jsonError(c, 404, "Document not found");
      }

      return c.json(doc[0], 200);
    },
  )
  .delete(
    "/:id",
    documented({
      tags: ["Documents"],
      summary: "Delete document",
      description: "Delete a document from storage and the database",
      responses: { 200: successSchema, 404: errorSchema },
    }),
    validate("param", idParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const user = c.get("user");
      const db = c.get("db");

      const doc = await db
        .select()
        .from(document)
        .where(and(eq(document.id, id), eq(document.user_id, user.id)))
        .limit(1);

      if (!doc[0]) {
        return jsonError(c, 404, "Document not found");
      }

      await env.USER_BUCKET.delete(doc[0].path);

      await db.delete(document).where(and(eq(document.id, id), eq(document.user_id, user.id)));

      return c.json({ success: true }, 200);
    },
  );
