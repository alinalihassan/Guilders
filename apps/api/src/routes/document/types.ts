import { t } from "elysia";

import { createSelectSchema } from "drizzle-orm/typebox-legacy";

import { document } from "../../db/schema/documents";

export const selectDocumentSchema = createSelectSchema(document);

export const createDocumentSchema = t.Object({
  file: t.File({
    maxSize: "10m",
    type: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "application/pdf",
    ],
  }),
  entity_type: t.Union([t.Literal("account"), t.Literal("transaction")]),
  entity_id: t.Numeric(),
});

export const documentIdParamSchema = t.Object({
  id: t.Number(),
});

export const documentQuerySchema = t.Object({
  entity_type: t.Optional(
    t.Union([t.Literal("account"), t.Literal("transaction")]),
  ),
  entity_id: t.Optional(t.Numeric()),
});

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function validateFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return `File type "${file.type}" is not allowed. Accepted: JPEG, PNG, WebP, HEIC, PDF.`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `File exceeds the 10MB size limit.`;
  }
  return null;
}

export function getExtension(file: File): string {
  const fromName = file.name?.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;

  const mimeMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "application/pdf": "pdf",
  };
  return mimeMap[file.type] ?? "bin";
}
