import { and, eq } from "drizzle-orm";
import { Elysia, status, t } from "elysia";
import {
  account,
  insertAccountSchema,
  selectAccountSchema,
} from "../../db/schema/accounts";
import { AccountTypeEnum } from "../../db/schema/enums";
import { db } from "../../lib/db";
import { authPlugin } from "../../middleware/auth";
import { errorSchema } from "../../utils/error";
import { idParamSchema, subtypeToType } from "./types";

export const accountRoutes = new Elysia({
  prefix: "/account",
  detail: {
    tags: ["Accounts"],
    security: [{ bearerAuth: [] }],
  }
})
  .use(authPlugin)
  .model({
    Account: selectAccountSchema,
    CreateAccount: insertAccountSchema,
  })
  .get(
    "",
    async ({ user }) => {
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

      return accounts;
    },
    {
      auth: true,
      response: t.Array(t.Ref("#/components/schemas/Account")),
      detail: {
        summary: "Get all accounts",
        description: "Retrieve all accounts for the authenticated user",
      },
    },
  )
  .post(
    "",
    async ({ body, user }) => {
      // Auto-calculate type from subtype
      const type = subtypeToType[body.subtype] || AccountTypeEnum.asset;

      // Handle liability sign (make value negative for liabilities if positive)
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
        return status(500, { error: "Failed to create account" });
      }

      return newAccount;
    },
    {
      auth: true,
      body: insertAccountSchema,
      response: {
        200: t.Ref("#/components/schemas/Account"),
        500: errorSchema,
      },
      detail: {
        summary: "Create account",
        description:
          "Create a new account with auto-calculated type from subtype",
      },
    },
  )
  .get(
    "/:id",
    async ({ params, user }) => {
      const accountResult = await db.query.account.findFirst({
        where: {
          id: params.id,
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
        return status(404, { error: "Account not found" });
      }

      // Get children
      const children = await db.query.account.findMany({
        where: {
          parent: params.id,
        },
      });

      return {
        account: accountResult,
        children,
      };
    },
    {
      auth: true,
      params: idParamSchema,
      response: {
        200: t.Object({
          account: t.Ref("#/components/schemas/Account"),
          children: t.Array(t.Ref("#/components/schemas/Account")),
        }),
        404: errorSchema,
      },
      detail: {
        summary: "Get account by ID",
        description: "Retrieve a specific account with its children",
      },
    },
  )
  .put(
    "/:id",
    async ({ params, body, user }) => {
      // Get existing account
      const existingAccount = await db.query.account.findFirst({
        where: {
          id: params.id,
          user_id: user.id,
        },
      });

      if (!existingAccount) {
        return status(404, { error: "Account not found" });
      }

      // Recalculate type if subtype changed
      let type: AccountTypeEnum = existingAccount.type;
      if (body.subtype && body.subtype !== existingAccount.subtype) {
        type = (subtypeToType[body.subtype] || AccountTypeEnum.asset) as AccountTypeEnum;
      }

      // Handle value sign for liabilities
      let value: number;
      if (body.value !== undefined) {
        value = parseFloat(body.value.toString());
      } else {
        value = parseFloat(existingAccount.value.toString());
      }

      if (type === AccountTypeEnum.liability && value > 0) {
        value = -value;
      }

      const [updatedAccount] = await db
        .update(account)
        .set({
          ...body,
          type: type as AccountTypeEnum,
          value: value.toString(),
          updated_at: new Date(),
        })
        .where(and(eq(account.id, params.id), eq(account.user_id, user.id)))
        .returning();

      if (!updatedAccount) {
        return status(500, { error: "Failed to update account" });
      }

      return updatedAccount;
    },
    {
      auth: true,
      params: idParamSchema,
      body: insertAccountSchema,
      response: {
        200: t.Ref("#/components/schemas/Account"),
        404: errorSchema,
        500: errorSchema,
      },
      detail: {
        summary: "Update account",
        description:
          "Update an account with automatic type recalculation if subtype changed",
      },
    },
  )
  .delete(
    "/:id",
    async ({ params, user }) => {
      // Verify account exists and belongs to user
      const existingAccount = await db.query.account.findFirst({
        where: {
          id: params.id,
          user_id: user.id,
        },
      });

      if (!existingAccount) {
        return status(404, { error: "Account not found" });
      }

      await db.transaction(async (tx) => {
        // Delete children first
        await tx.delete(account).where(eq(account.parent, params.id));
        // Delete the account
        await tx.delete(account).where(eq(account.id, params.id));
      });

      return { success: true };
    },
    {
      auth: true,
      params: idParamSchema,
      response: {
        200: t.Object({ success: t.Boolean() }),
        404: errorSchema,
      },
      detail: {
        summary: "Delete account",
        description: "Delete an account and all its children",
      },
    },
  );
