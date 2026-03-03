import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { Elysia, status, t } from "elysia";

import { document } from "../../db/schema/documents";
import type { Database } from "../../lib/db";
import { authPlugin } from "../../middleware/auth";
import { errorSchema } from "../../utils/error";
import {
  createDocumentSchema,
  documentIdParamSchema,
  documentQuerySchema,
  getExtension,
  sanitizeFilenameForDisposition,
  selectDocumentSchema,
  validateFile,
} from "./types";

async function verifyEntityOwnership(
  db: Database,
  userId: string,
  entityType: "account" | "transaction",
  entityId: number,
): Promise<boolean> {
  if (entityType === "account") {
    const result = await db.query.account.findFirst({
      where: { id: entityId, user_id: userId },
    });
    return !!result;
  }
  const result = await db.query.transaction.findFirst({
    where: { id: entityId, account: { user_id: userId } },
  });
  return !!result;
}

export const documentRoutes = new Elysia({
  prefix: "/document",
  detail: {
    tags: ["Documents"],
    security: [{ apiKeyAuth: [], bearerAuth: [] }],
  },
})
  .use(authPlugin)
  .model({ Document: selectDocumentSchema })
  .get(
    "",
    async ({ user, query, db }) => {
      const conditions = [eq(document.user_id, user.id)];

      if (query.entity_type) {
        conditions.push(eq(document.entity_type, query.entity_type));
      }
      if (query.entity_id) {
        conditions.push(eq(document.entity_id, query.entity_id));
      }

      return await db
        .select()
        .from(document)
        .where(and(...conditions));
    },
    {
      auth: true,
      query: documentQuerySchema,
      response: t.Array(t.Ref("#/components/schemas/Document")),
      detail: {
        summary: "List documents",
        description:
          "List documents for the authenticated user, optionally filtered by entity type and ID",
      },
    },
  )
  .post(
    "",
    async ({ body, user, db }) => {
      const validationError = validateFile(body.file);
      if (validationError) {
        return status(400, { error: validationError });
      }

      const ownsEntity = await verifyEntityOwnership(db, user.id, body.entity_type, body.entity_id);
      if (!ownsEntity) {
        return status(404, {
          error: `${body.entity_type === "account" ? "Account" : "Transaction"} not found`,
        });
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
            entity_type: body.entity_type,
            entity_id: body.entity_id,
            name: body.file.name || `${uuid}.${ext}`,
            path: r2Key,
            size: body.file.size,
            type: body.file.type,
          })
          .returning();
      } catch {
        await env.USER_BUCKET.delete(r2Key);
        return status(500, { error: "Failed to create document record" });
      }

      if (!doc) {
        await env.USER_BUCKET.delete(r2Key);
        return status(500, { error: "Failed to create document record" });
      }

      return doc;
    },
    {
      auth: true,
      body: createDocumentSchema,
      response: {
        200: t.Ref("#/components/schemas/Document"),
        400: errorSchema,
        404: errorSchema,
        500: errorSchema,
      },
      detail: {
        summary: "Upload document",
        description:
          "Upload a file (JPEG, PNG, WebP, HEIC, PDF; max 10MB) and attach it to an account or transaction",
      },
    },
  )
  .get(
    "/:id",
    async ({ params, user, db }) => {
      const doc = await db
        .select()
        .from(document)
        .where(and(eq(document.id, params.id), eq(document.user_id, user.id)))
        .limit(1);

      if (!doc[0]) {
        return status(404, { error: "Document not found" });
      }

      return doc[0];
    },
    {
      auth: true,
      params: documentIdParamSchema,
      response: {
        200: t.Ref("#/components/schemas/Document"),
        404: errorSchema,
      },
      detail: {
        summary: "Get document metadata",
        description: "Retrieve metadata for a specific document",
      },
    },
  )
  .get(
    "/:id/file",
    async ({ params, user, db, set }) => {
      const doc = await db
        .select()
        .from(document)
        .where(and(eq(document.id, params.id), eq(document.user_id, user.id)))
        .limit(1);

      if (!doc[0]) {
        return status(404, { error: "Document not found" });
      }

      const object = await env.USER_BUCKET.get(doc[0].path);
      if (!object) {
        return status(404, { error: "File not found in storage" });
      }

      const { safe: safeName, encoded: encodedName } =
        sanitizeFilenameForDisposition(doc[0].name);
      set.headers["content-type"] = doc[0].type;
      set.headers["content-disposition"] = `inline; filename="${safeName}"; filename*=UTF-8''${encodedName}`;
      set.headers["cache-control"] = "private, max-age=3600";

      return new Response(object.body);
    },
    {
      auth: true,
      params: documentIdParamSchema,
      detail: {
        summary: "Download document file",
        description: "Stream the document file content from storage",
      },
    },
  )
  .delete(
    "/:id",
    async ({ params, user, db }) => {
      const doc = await db
        .select()
        .from(document)
        .where(and(eq(document.id, params.id), eq(document.user_id, user.id)))
        .limit(1);

      if (!doc[0]) {
        return status(404, { error: "Document not found" });
      }

      await env.USER_BUCKET.delete(doc[0].path);

      await db
        .delete(document)
        .where(and(eq(document.id, params.id), eq(document.user_id, user.id)));

      return { success: true };
    },
    {
      auth: true,
      params: documentIdParamSchema,
      response: {
        200: t.Object({ success: t.Boolean() }),
        404: errorSchema,
      },
      detail: {
        summary: "Delete document",
        description: "Delete a document from storage and the database",
      },
    },
  );
