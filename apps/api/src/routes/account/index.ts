import { waitUntil } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { account, selectAccountSchema } from "../../db/schema/accounts";
import { AccountTypeEnum } from "../../db/schema/enums";
import { computeAccountHistory } from "../../lib/balance-history";
import { cleanupAccountDocuments } from "../../lib/cleanup-documents";
import { documented, idParamSchema, jsonError, successSchema, validate } from "../../lib/http";
import { filterLockedUpdate } from "../../lib/locked-attributes";
import { deliverUserWebhookEvents } from "../../lib/user-webhooks";
import { requireAuth, type AuthEnv } from "../../middleware/auth";
import { errorSchema } from "../../utils/error";
import {
  createAccountSchema,
  dateRangeQuerySchema,
  subtypeToType,
  updateAccountSchema,
} from "./types";

const accountWithChildrenSchema = z.object({
  account: selectAccountSchema,
  children: z.array(selectAccountSchema),
});

const snapshotResponseSchema = z.object({
  snapshots: z.array(
    z.object({
      date: z.string(),
      balance: z.string(),
      currency: z.string(),
    }),
  ),
});

export const accountRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .get(
    "/",
    documented({
      tags: ["Accounts"],
      summary: "Get all accounts",
      description: "Retrieve all accounts for the authenticated user",
      responses: { 200: z.array(selectAccountSchema) },
    }),
    async (c) => {
      const user = c.get("user");
      const db = c.get("db");
      const accounts = await db.query.account.findMany({
        where: {
          user_id: user.id,
        },
        with: {
          institutionConnection: {
            with: {
              institution: {
                with: {
                  provider: true,
                },
              },
            },
          },
        },
      });

      return c.json(accounts, 200);
    },
  )
  .post(
    "/",
    documented({
      tags: ["Accounts"],
      summary: "Create account",
      description: "Create a new account with auto-calculated type from subtype",
      responses: { 200: selectAccountSchema, 500: errorSchema },
    }),
    validate("json", createAccountSchema),
    async (c) => {
      const body = c.req.valid("json");
      const user = c.get("user");
      const db = c.get("db");

      const type = subtypeToType[body.subtype] || AccountTypeEnum.asset;

      let value = parseFloat(body.value?.toString() || "0");
      if (type === AccountTypeEnum.liability && value > 0) {
        value = -value;
      }

      const [newAccount] = await db
        .insert(account)
        .values({
          ...body,
          user_id: user.id,
          type: type as AccountTypeEnum,
          value: value.toString(),
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();

      if (!newAccount) {
        return jsonError(c, 500, "Failed to create account");
      }

      waitUntil(deliverUserWebhookEvents(db, user.id, "account.created", { account: newAccount }));

      return c.json(newAccount, 200);
    },
  )
  .get(
    "/:id/balance-history",
    documented({
      tags: ["Balance History"],
      summary: "Get account balance history",
      description: "Returns daily balances computed from transactions and market prices",
      responses: { 200: snapshotResponseSchema, 404: errorSchema },
    }),
    validate("param", idParamSchema),
    validate("query", dateRangeQuerySchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const query = c.req.valid("query");
      const user = c.get("user");
      const db = c.get("db");

      const accountResult = await db.query.account.findFirst({
        where: {
          id,
          user_id: user.id,
        },
      });

      if (!accountResult) {
        return jsonError(c, 404, "Account not found");
      }

      const snapshots = await computeAccountHistory(db, user.id, id, query.from, query.to);
      if (!snapshots) {
        return jsonError(c, 404, "Account not found");
      }

      return c.json({ snapshots }, 200);
    },
  )
  .get(
    "/:id",
    documented({
      tags: ["Accounts"],
      summary: "Get account by ID",
      description: "Retrieve a specific account with its children",
      responses: { 200: accountWithChildrenSchema, 404: errorSchema },
    }),
    validate("param", idParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const user = c.get("user");
      const db = c.get("db");

      const accountResult = await db.query.account.findFirst({
        where: {
          id,
          user_id: user.id,
        },
        with: {
          institutionConnection: {
            with: {
              institution: {
                with: {
                  provider: true,
                },
              },
            },
          },
        },
      });

      if (!accountResult) {
        return jsonError(c, 404, "Account not found");
      }

      const children = await db.query.account.findMany({
        where: {
          parent: id,
        },
      });

      return c.json(
        {
          account: accountResult,
          children,
        },
        200,
      );
    },
  )
  .put(
    "/:id",
    documented({
      tags: ["Accounts"],
      summary: "Update account",
      description: "Update an account with automatic type recalculation if subtype changed",
      responses: { 200: selectAccountSchema, 409: errorSchema, 404: errorSchema, 500: errorSchema },
    }),
    validate("param", idParamSchema),
    validate("json", updateAccountSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const user = c.get("user");
      const db = c.get("db");

      const existingAccount = await db.query.account.findFirst({
        where: {
          id,
          user_id: user.id,
        },
      });

      if (!existingAccount) {
        return jsonError(c, 404, "Account not found");
      }

      const { allowed, blocked } = filterLockedUpdate(
        body as Record<string, unknown>,
        existingAccount.locked_attributes,
      );

      if (blocked.length > 0) {
        console.warn("[Account] blocked locked attribute update", {
          accountId: id,
          userId: user.id,
          blockedFields: blocked,
        });
        return jsonError(
          c,
          409,
          `Cannot update locked attributes: ${blocked.map(String).join(", ")}`,
        );
      }
      const unlockedBody = allowed as typeof body;

      let type: AccountTypeEnum = existingAccount.type;
      if (unlockedBody.subtype && unlockedBody.subtype !== existingAccount.subtype) {
        type = (subtypeToType[unlockedBody.subtype] || AccountTypeEnum.asset) as AccountTypeEnum;
      }

      let value: number;
      if (unlockedBody.value !== undefined) {
        value = parseFloat(unlockedBody.value.toString());
      } else {
        value = parseFloat(existingAccount.value.toString());
      }

      if (type === AccountTypeEnum.liability && value > 0) {
        value = -value;
      }

      const [updatedAccount] = await db
        .update(account)
        .set({
          ...unlockedBody,
          type: type as AccountTypeEnum,
          value: value.toString(),
          updated_at: new Date(),
        })
        .where(and(eq(account.id, id), eq(account.user_id, user.id)))
        .returning();

      if (!updatedAccount) {
        return jsonError(c, 500, "Failed to update account");
      }

      waitUntil(
        deliverUserWebhookEvents(db, user.id, "account.updated", { account: updatedAccount }),
      );

      return c.json(updatedAccount, 200);
    },
  )
  .delete(
    "/:id",
    documented({
      tags: ["Accounts"],
      summary: "Delete account",
      description: "Delete an account and all its children",
      responses: { 200: successSchema, 404: errorSchema },
    }),
    validate("param", idParamSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const user = c.get("user");
      const db = c.get("db");

      const existingAccount = await db.query.account.findFirst({
        where: {
          id,
          user_id: user.id,
        },
      });

      if (!existingAccount) {
        return jsonError(c, 404, "Account not found");
      }

      await cleanupAccountDocuments(db, user.id, id);

      const deleted = await db
        .delete(account)
        .where(and(eq(account.id, id), eq(account.user_id, user.id)))
        .returning({ id: account.id });

      if (deleted.length === 0) {
        return jsonError(c, 404, "Account not found");
      }

      waitUntil(
        deliverUserWebhookEvents(db, user.id, "account.deleted", { account: existingAccount }),
      );

      return c.json({ success: true }, 200);
    },
  );
