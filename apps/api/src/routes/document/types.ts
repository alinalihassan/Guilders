import { createSelectSchema } from "drizzle-orm/typebox-legacy";
import { t } from "elysia";

import { document } from "../../db/schema/documents";

export const selectDocumentSchema = createSelectSchema(document);

export const createDocumentSchema = t.Object({
  file: t.File({
    maxSize: "10m",
    type: ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"],
  }),
  entity_type: t.Union([t.Literal("account"), t.Literal("transaction")]),
  entity_id: t.Numeric(),
});

export const documentIdParamSchema = t.Object({
  id: t.Number(),
});

export const documentQuerySchema = t.Object({
  entity_type: t.Optional(t.Union([t.Literal("account"), t.Literal("transaction")])),
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

const mimeMap: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "application/pdf": "pdf",
};

export function getExtension(file: File): string {
  const byMime = mimeMap[file.type];
  if (byMime) return byMime;
  const fromName = file.name?.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;
  return "bin";
}

const MAX_DISPOSITION_FILENAME_LENGTH = 255;
const FALLBACK_DISPOSITION_FILENAME = "download";

/**
 * Sanitizes a user-controlled filename for use in Content-Disposition (RFC 6266 / RFC 5987).
 * Removes control characters (CR/LF etc.), quotes and path separators, enforces max length,
 * and returns a safe ASCII name for `filename=` and a percent-encoded value for `filename*=`.
 */
export function sanitizeFilenameForDisposition(name: string | null | undefined): {
  safe: string;
  encoded: string;
} {
  if (typeof name !== "string" || !name.trim()) {
    return {
      safe: FALLBACK_DISPOSITION_FILENAME,
      encoded: encodeURIComponent(FALLBACK_DISPOSITION_FILENAME),
    };
  }
  let s = Array.from(name)
    .filter((c) => {
      const code = c.charCodeAt(0);
      return code > 31 && code !== 127;
    })
    .join("")
    .replace(/["\\/]/g, "")
    .trim();
  const lastSegment = s.split(/[/\\]/).pop();
  s = (lastSegment ?? s).trim();
  if (!s) {
    return {
      safe: FALLBACK_DISPOSITION_FILENAME,
      encoded: encodeURIComponent(FALLBACK_DISPOSITION_FILENAME),
    };
  }
  if (s.length > MAX_DISPOSITION_FILENAME_LENGTH) {
    s = s.slice(0, MAX_DISPOSITION_FILENAME_LENGTH);
  }
  const safe = s.replace(/[^\u0020-\u007e]/g, "_") || FALLBACK_DISPOSITION_FILENAME;
  const encoded = encodeURIComponent(s);
  return { safe, encoded };
}
