import { z } from "zod";

import { insertAccountSchema } from "../../db/schema/accounts";
import type { Account as DbAccount, InsertAccount } from "../../db/schema/accounts";
import { AccountSubtypeEnum, AccountTypeEnum } from "../../db/schema/enums";
import type { InstitutionConnection } from "../../db/schema/institution-connections";
import type { Institution } from "../../db/schema/institutions";
import type { Provider } from "../../db/schema/providers";

export const subtypeToType: Record<string, string> = {
  [AccountSubtypeEnum.depository]: AccountTypeEnum.asset,
  [AccountSubtypeEnum.brokerage]: AccountTypeEnum.asset,
  [AccountSubtypeEnum.crypto]: AccountTypeEnum.asset,
  [AccountSubtypeEnum.property]: AccountTypeEnum.asset,
  [AccountSubtypeEnum.vehicle]: AccountTypeEnum.asset,
  [AccountSubtypeEnum.creditcard]: AccountTypeEnum.liability,
  [AccountSubtypeEnum.loan]: AccountTypeEnum.liability,
  [AccountSubtypeEnum.stock]: AccountTypeEnum.asset,
};

export const createAccountSchema = insertAccountSchema.omit({
  id: true,
  user_id: true,
  created_at: true,
  updated_at: true,
  locked_attributes: true,
});
export const updateAccountSchema = createAccountSchema.partial();

export type Account = DbAccount & {
  institutionConnection?:
    | (InstitutionConnection & {
        institution?: Institution & { provider?: Provider | null };
        provider?: Provider | null;
      })
    | null;
  children?: Account[];
};

export type CreateAccount = Omit<
  InsertAccount,
  "id" | "user_id" | "created_at" | "updated_at" | "locked_attributes"
>;

export type UpdateAccount = Partial<CreateAccount>;

export const dateRangeQuerySchema = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
});
