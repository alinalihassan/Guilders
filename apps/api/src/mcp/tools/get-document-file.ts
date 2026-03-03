import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import * as z from "zod/v4";

import { document } from "../../db/schema/documents";
import { createDb } from "../../lib/db";
import type { McpContentBlock, McpToolDefinition } from "./types";

type GetDocumentFileInput = {
  id: number;
};

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/gif",
]);

function toBase64(buffer: ArrayBuffer): string {
  return btoa(
    Array.from(new Uint8Array(buffer))
      .map((b) => String.fromCharCode(b))
      .join(""),
  );
}

export const getDocumentFileTool: McpToolDefinition<GetDocumentFileInput> = {
  name: "get_document_file",
  description:
    "Retrieve the actual file content of a document by its ID. Returns images and PDFs inline so you can see and understand them.",
  requiredScope: "read",
  inputSchema: {
    id: z.number().int(),
  },
  handler: async ({ id }, { userId }) => {
    try {
      const db = createDb();

      const [doc] = await db
        .select()
        .from(document)
        .where(and(eq(document.id, id), eq(document.user_id, userId)))
        .limit(1);

      if (!doc) {
        return {
          isError: true,
          content: [{ type: "text", text: "Document not found or does not belong to user." }],
        };
      }

      const object = await env.USER_BUCKET.get(doc.path);
      if (!object) {
        return {
          isError: true,
          content: [{ type: "text", text: "File not found in storage." }],
        };
      }

      const metadata: McpContentBlock = {
        type: "text",
        text: JSON.stringify({
          id: doc.id,
          name: doc.name,
          mimeType: doc.type,
          size: doc.size,
          entity_type: doc.entity_type,
          entity_id: doc.entity_id,
        }),
      };

      const arrayBuffer = await object.arrayBuffer();
      const base64 = toBase64(arrayBuffer);

      if (IMAGE_MIME_TYPES.has(doc.type)) {
        return {
          content: [metadata, { type: "image", data: base64, mimeType: doc.type }],
        };
      }

      return {
        content: [
          metadata,
          {
            type: "resource",
            resource: {
              uri: `guilders://document/${doc.id}`,
              mimeType: doc.type,
              blob: base64,
            },
          },
        ],
      };
    } catch (error) {
      console.error("MCP get_document_file failed:", error);
      return {
        isError: true,
        content: [{ type: "text", text: "Failed to fetch document file." }],
      };
    }
  },
};
