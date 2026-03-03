import { and, eq } from "drizzle-orm";
import * as z from "zod/v4";

import { document } from "../../db/schema/documents";
import { DocumentEntityTypeEnum } from "../../db/schema/enums";
import { createDb } from "../../lib/db";
import { makeTextPayload, type McpToolDefinition } from "./types";

type GetDocumentsInput = {
  entity_type?: string;
  entity_id?: number;
  id?: number;
  limit: number;
};

export const getDocumentsTool: McpToolDefinition<GetDocumentsInput> = {
  name: "get_documents",
  description:
    "Return documents (file attachments) for the authenticated user, optionally filtered by entity type, entity ID, or document ID",
  requiredScope: "read",
  inputSchema: {
    entity_type: z.enum(Object.values(DocumentEntityTypeEnum) as [string, ...string[]]).optional(),
    entity_id: z.number().int().optional(),
    id: z.number().int().optional(),
    limit: z.number().int().min(1).max(100).default(50),
  },
  handler: async ({ entity_type, entity_id, id, limit }, { userId }) => {
    try {
      const db = createDb();

      const conditions = [eq(document.user_id, userId)];
      if (id !== undefined) {
        conditions.push(eq(document.id, id));
      }
      if (entity_type) {
        conditions.push(eq(document.entity_type, entity_type as DocumentEntityTypeEnum));
      }
      if (entity_id !== undefined) {
        conditions.push(eq(document.entity_id, entity_id));
      }

      const docs = await db
        .select({
          id: document.id,
          name: document.name,
          type: document.type,
          size: document.size,
          entity_type: document.entity_type,
          entity_id: document.entity_id,
          created_at: document.created_at,
        })
        .from(document)
        .where(and(...conditions))
        .limit(limit);

      return makeTextPayload({
        userId,
        count: docs.length,
        documents: docs,
      });
    } catch (error) {
      console.error("MCP get_documents failed:", error);
      return {
        isError: true,
        content: [{ type: "text", text: "Failed to fetch documents." }],
      };
    }
  },
};
