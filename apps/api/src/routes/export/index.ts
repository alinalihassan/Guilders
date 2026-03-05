import { env } from "cloudflare:workers";
import { desc, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { zipSync } from "fflate";

import type { Account } from "../../db/schema/accounts";
import { account } from "../../db/schema/accounts";
import { category } from "../../db/schema/categories";
import { conversation } from "../../db/schema/conversations";
import { document } from "../../db/schema/documents";
import { transaction } from "../../db/schema/transactions";
import { authPlugin } from "../../middleware/auth";
import { errorSchema } from "../../utils/error";
import { sanitizeFilenameForDisposition } from "../document/types";

const MAX_DOCUMENTS = 100;
const MAX_TOTAL_DOCUMENT_BYTES = 50 * 1024 * 1024; // 50 MB

/** Strip provider/connection fields from account for export (no provider data). */
function accountForExport(row: Account): Record<string, unknown> {
  const o = { ...row } as Record<string, unknown>;
  delete o.institution_connection_id;
  delete o.provider_account_id;
  return o;
}

/** Strip provider fields from transaction for export. */
function transactionForExport(row: Record<string, unknown>): Record<string, unknown> {
  const o = { ...row };
  delete o.provider_transaction_id;
  return o;
}

/** Document metadata for export (no internal path). */
function documentMetadataForExport(row: {
  id: number;
  name: string;
  type: string;
  size: number;
  entity_type: string;
  entity_id: number;
  created_at: Date;
  updated_at: Date;
}): Record<string, unknown> {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    size: row.size,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toU8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

export const exportRoutes = new Elysia({
  prefix: "/export",
  detail: {
    tags: ["Export"],
    security: [{ apiKeyAuth: [] }, { bearerAuth: [] }],
  },
})
  .use(authPlugin)
  .get(
    "",
    async ({ user, db }) => {
      if (env.USER_BUCKET == null) {
        return new Response(
          JSON.stringify({ error: "Storage not configured; data export is unavailable." }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        );
      }

      const [accounts, transactions, categories, conversations, documents] = await Promise.all([
        db.select().from(account).where(eq(account.user_id, user.id)),
        db
          .select()
          .from(transaction)
          .innerJoin(account, eq(transaction.account_id, account.id))
          .where(eq(account.user_id, user.id))
          .orderBy(desc(transaction.date))
          .then((rows) => rows.map((r) => r.transaction)),
        db.select().from(category).where(eq(category.user_id, user.id)),
        db.select().from(conversation).where(eq(conversation.user_id, user.id)),
        db
          .select({
            id: document.id,
            name: document.name,
            type: document.type,
            size: document.size,
            entity_type: document.entity_type,
            entity_id: document.entity_id,
            path: document.path,
            created_at: document.created_at,
            updated_at: document.updated_at,
          })
          .from(document)
          .where(eq(document.user_id, user.id)),
      ]);

      if (documents.length > MAX_DOCUMENTS) {
        return new Response(
          JSON.stringify({
            error: `Export limit exceeded: maximum ${MAX_DOCUMENTS} documents. You have ${documents.length}.`,
          }),
          { status: 413, headers: { "Content-Type": "application/json" } },
        );
      }

      const zippable: Record<string, Uint8Array> = {
        "accounts.json": toU8(
          JSON.stringify(
            accounts.map((a) => accountForExport(a)),
            null,
            2,
          ),
        ),
        "transactions.json": toU8(
          JSON.stringify(
            transactions.map((tx) =>
              transactionForExport(tx as unknown as Record<string, unknown>),
            ),
            null,
            2,
          ),
        ),
        "categories.json": toU8(JSON.stringify(categories, null, 2)),
        "conversations.json": toU8(JSON.stringify(conversations, null, 2)),
        "documents.json": toU8(
          JSON.stringify(
            documents.map((d) =>
              documentMetadataForExport({
                id: d.id,
                name: d.name,
                type: d.type,
                size: d.size,
                entity_type: d.entity_type,
                entity_id: d.entity_id,
                created_at: d.created_at,
                updated_at: d.updated_at,
              }),
            ),
            null,
            2,
          ),
        ),
      };

      let totalDocumentBytes = 0;
      const seenNames = new Map<string, number>();

      for (const doc of documents) {
        if (totalDocumentBytes >= MAX_TOTAL_DOCUMENT_BYTES) {
          return new Response(
            JSON.stringify({
              error: `Export limit exceeded: total document size exceeds ${MAX_TOTAL_DOCUMENT_BYTES / 1024 / 1024} MB.`,
            }),
            { status: 413, headers: { "Content-Type": "application/json" } },
          );
        }
        const object = await env.USER_BUCKET.get(doc.path);
        if (object == null) continue;
        const body = await object.arrayBuffer();
        const bytes = new Uint8Array(body);
        totalDocumentBytes += bytes.length;

        const { safe } = sanitizeFilenameForDisposition(doc.name);
        const base = safe || `document-${doc.id}`;
        const hasExt = base.includes(".");
        const ext = hasExt ? "" : getExtensionFromMime(doc.type);
        const count = seenNames.get(base) ?? 0;
        seenNames.set(base, count + 1);
        const name = count === 0 ? base + ext : `${base.replace(/\.[^.]+$/, "")}-${count}${ext}`;
        zippable[`documents/${name}`] = bytes;
      }

      const zipBytes = zipSync(zippable, { level: 6 });
      const filename = `guilders-export-${new Date().toISOString().slice(0, 10)}.zip`;

      return new Response(zipBytes, {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "private, no-store",
        },
      });
    },
    {
      auth: true,
      response: {
        200: t.File({
          type: "application/zip",
          description:
            "ZIP archive containing accounts.json, transactions.json, categories.json, conversations.json, documents.json, and documents/ folder with files.",
        }),
        413: errorSchema,
        503: errorSchema,
      },
      detail: {
        summary: "Download my data",
        description:
          "Export all your data (accounts, transactions, categories, conversations, document metadata and files) as a ZIP. No provider/connection identifiers are included. Limits: max 100 documents, max 50 MB total document size; returns 413 when exceeded.",
      },
    },
  );

function getExtensionFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/heic": ".heic",
    "application/pdf": ".pdf",
  };
  return map[mime] ?? ".bin";
}
