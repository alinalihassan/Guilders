import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { conversation } from "../../db/schema/conversations";
import {
  documented,
  jsonError,
  stringIdParamSchema,
  successSchema,
  validate,
} from "../../lib/http";
import { requireAuth, type AuthEnv } from "../../middleware/auth";
import { errorSchema } from "../../utils/error";

const conversationListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  created_at: z.union([z.string(), z.date()]),
  updated_at: z.union([z.string(), z.date()]),
});

const conversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  messages: z.array(z.unknown()),
  created_at: z.union([z.string(), z.date()]),
  updated_at: z.union([z.string(), z.date()]),
});

const createConversationResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
});

const renameConversationSchema = z.object({
  title: z.string().min(1).max(200),
});

const renamedConversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  updated_at: z.union([z.string(), z.date()]),
});

export const conversationRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .get(
    "/",
    documented({
      tags: ["Conversations"],
      summary: "List conversations",
      description: "List the authenticated user's conversations, most recent first.",
      responses: { 200: z.array(conversationListItemSchema) },
    }),
    async (c) => {
      const user = c.get("user");
      const db = c.get("db");
      const rows = await db
        .select({
          id: conversation.id,
          title: conversation.title,
          created_at: conversation.created_at,
          updated_at: conversation.updated_at,
        })
        .from(conversation)
        .where(eq(conversation.user_id, user.id))
        .orderBy(desc(conversation.updated_at))
        .limit(50);
      return c.json(rows, 200);
    },
  )
  .get(
    "/last",
    documented({
      tags: ["Conversations"],
      summary: "Get last conversation",
      description: "Get the most recently updated conversation for the authenticated user.",
      responses: { 200: conversationSchema, 404: errorSchema },
    }),
    async (c) => {
      const user = c.get("user");
      const db = c.get("db");
      const row = await db.query.conversation.findFirst({
        where: { user_id: user.id },
        orderBy: (conv) => desc(conv.updated_at),
      });
      if (!row) return jsonError(c, 404, "No conversations found");
      return c.json(row, 200);
    },
  )
  .get(
    "/:id",
    documented({
      tags: ["Conversations"],
      summary: "Get conversation",
      description: "Get a single conversation by ID.",
      responses: { 200: conversationSchema, 404: errorSchema },
    }),
    validate("param", stringIdParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const user = c.get("user");
      const db = c.get("db");
      const row = await db.query.conversation.findFirst({
        where: {
          id,
          user_id: user.id,
        },
      });
      if (!row) return jsonError(c, 404, "Conversation not found");
      return c.json(row, 200);
    },
  )
  .post(
    "/",
    documented({
      tags: ["Conversations"],
      summary: "Create conversation",
      description: "Create a new empty conversation.",
      responses: { 200: createConversationResponseSchema, 500: errorSchema },
    }),
    async (c) => {
      const user = c.get("user");
      const db = c.get("db");
      const id = crypto.randomUUID();
      const [row] = await db
        .insert(conversation)
        .values({
          id,
          user_id: user.id,
        })
        .returning({ id: conversation.id, title: conversation.title });

      if (!row) return jsonError(c, 500, "Failed to create conversation");
      return c.json(row, 200);
    },
  )
  .patch(
    "/:id",
    documented({
      tags: ["Conversations"],
      summary: "Rename conversation",
      description: "Update the title of a conversation.",
      responses: { 200: renamedConversationSchema, 404: errorSchema },
    }),
    validate("param", stringIdParamSchema),
    validate("json", renameConversationSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const user = c.get("user");
      const db = c.get("db");
      const [updated] = await db
        .update(conversation)
        .set({ title: body.title, updated_at: new Date() })
        .where(and(eq(conversation.id, id), eq(conversation.user_id, user.id)))
        .returning({
          id: conversation.id,
          title: conversation.title,
          updated_at: conversation.updated_at,
        });

      if (!updated) return jsonError(c, 404, "Conversation not found");
      return c.json(updated, 200);
    },
  )
  .delete(
    "/:id",
    documented({
      tags: ["Conversations"],
      summary: "Delete conversation",
      description: "Delete a conversation.",
      responses: { 200: successSchema, 404: errorSchema },
    }),
    validate("param", stringIdParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const user = c.get("user");
      const db = c.get("db");
      const [deleted] = await db
        .delete(conversation)
        .where(and(eq(conversation.id, id), eq(conversation.user_id, user.id)))
        .returning({ id: conversation.id });

      if (!deleted) return jsonError(c, 404, "Conversation not found");
      return c.json({ success: true }, 200);
    },
  );
