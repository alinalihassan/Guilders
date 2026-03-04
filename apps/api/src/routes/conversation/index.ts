import { and, desc, eq } from "drizzle-orm";
import { Elysia, status, t } from "elysia";

import { conversation } from "../../db/schema/conversations";
import { authPlugin } from "../../middleware/auth";
import { errorSchema } from "../../utils/error";

export const conversationRoutes = new Elysia({
  prefix: "/conversation",
  detail: {
    tags: ["Conversations"],
    security: [{ apiKeyAuth: [] }, { bearerAuth: [] }],
  },
})
  .use(authPlugin)
  .get(
    "",
    async ({ user, db }) => {
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
      return rows;
    },
    {
      auth: true,
      response: {
        200: t.Array(
          t.Object({
            id: t.String(),
            title: t.String(),
            created_at: t.Date(),
            updated_at: t.Date(),
          }),
        ),
      },
      detail: {
        summary: "List conversations",
        description: "List the authenticated user's conversations, most recent first.",
      },
    },
  )
  .get(
    "/last",
    async ({ user, db }) => {
      const row = await db.query.conversation.findFirst({
        where: { user_id: user.id },
        orderBy: (c) => desc(c.updated_at),
      });
      if (!row) return status(404, { error: "No conversations found" });
      return row;
    },
    {
      auth: true,
      response: {
        200: t.Object({
          id: t.String(),
          title: t.String(),
          messages: t.Array(t.Any()),
          created_at: t.Date(),
          updated_at: t.Date(),
        }),
        404: errorSchema,
      },
      detail: {
        summary: "Get last conversation",
        description: "Get the most recently updated conversation for the authenticated user.",
      },
    },
  )
  .get(
    "/:id",
    async ({ params, user, db }) => {
      const row = await db.query.conversation.findFirst({
        where: {
          id: params.id,
          user_id: user.id,
        },
      });
      if (!row) return status(404, { error: "Conversation not found" });
      return row;
    },
    {
      auth: true,
      params: t.Object({ id: t.String() }),
      response: {
        200: t.Object({
          id: t.String(),
          title: t.String(),
          messages: t.Array(t.Any()),
          created_at: t.Date(),
          updated_at: t.Date(),
        }),
        404: errorSchema,
      },
      detail: {
        summary: "Get conversation",
        description: "Get a single conversation by ID.",
      },
    },
  )
  .post(
    "",
    async ({ user, db }) => {
      const id = crypto.randomUUID();
      const [row] = await db
        .insert(conversation)
        .values({
          id,
          user_id: user.id,
        })
        .returning({ id: conversation.id, title: conversation.title });

      if (!row) return status(500, { error: "Failed to create conversation" });
      return row;
    },
    {
      auth: true,
      response: {
        200: t.Object({ id: t.String(), title: t.String() }),
        500: errorSchema,
      },
      detail: {
        summary: "Create conversation",
        description: "Create a new empty conversation.",
      },
    },
  )
  .patch(
    "/:id",
    async ({ params, body, user, db }) => {
      const [updated] = await db
        .update(conversation)
        .set({ title: body.title, updated_at: new Date() })
        .where(and(eq(conversation.id, params.id), eq(conversation.user_id, user.id)))
        .returning({
          id: conversation.id,
          title: conversation.title,
          updated_at: conversation.updated_at,
        });

      if (!updated) return status(404, { error: "Conversation not found" });
      return updated;
    },
    {
      auth: true,
      params: t.Object({ id: t.String() }),
      body: t.Object({ title: t.String({ minLength: 1, maxLength: 200 }) }),
      response: {
        200: t.Object({ id: t.String(), title: t.String(), updated_at: t.Date() }),
        404: errorSchema,
      },
      detail: {
        summary: "Rename conversation",
        description: "Update the title of a conversation.",
      },
    },
  )
  .delete(
    "/:id",
    async ({ params, user, db }) => {
      const [deleted] = await db
        .delete(conversation)
        .where(and(eq(conversation.id, params.id), eq(conversation.user_id, user.id)))
        .returning({ id: conversation.id });

      if (!deleted) return status(404, { error: "Conversation not found" });
      return { success: true };
    },
    {
      auth: true,
      params: t.Object({ id: t.String() }),
      response: {
        200: t.Object({ success: t.Boolean() }),
        404: errorSchema,
      },
      detail: {
        summary: "Delete conversation",
        description: "Delete a conversation.",
      },
    },
  );
