import { t } from "elysia";

import { insertAccountSchema } from "../../db/schema/accounts";
import type { Account as DbAccount, InsertAccount } from "../../db/schema/accounts";
import { AccountSubtypeEnum, AccountTypeEnum } from "../../db/schema/enums";
import type { InstitutionConnection } from "../../db/schema/institution-connections";
import type { Institution } from "../../db/schema/institutions";
import type { Provider } from "../../db/schema/providers";

// Subtype to type mapping
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

export const idParamSchema = t.Object({
  id: t.Number(),
});

export const createAccountSchema = t.Omit(insertAccountSchema, ["user_id", "locked_attributes"]);
export const updateAccountSchema = t.Partial(createAccountSchema);

export type Account = DbAccount & {
  institutionConnection?:
    | (InstitutionConnection & {
        institution?: Institution & { provider?: Provider | null };
        provider?: Provider | null;
      })
    | null;
  institution_connection?:
    | (InstitutionConnection & {
        institution?: Institution & { provider?: Provider | null };
        provider?: Provider | null;
      })
    | null;
  children?: Account[];
};

type BaseCreateAccount = Omit<
  InsertAccount,
  | "id"
  | "user_id"
  | "created_at"
  | "updated_at"
  | "type"
  | "subtype"
  | "value"
  | "investable"
  | "taxability"
  | "tax_rate"
>;

export type CreateAccount = BaseCreateAccount & {
  type?: `${DbAccount["type"]}`;
  subtype: `${DbAccount["subtype"]}`;
  value: number | string;
  investable?: `${DbAccount["investable"]}`;
  taxability?: `${DbAccount["taxability"]}`;
  tax_rate?: number | string | null;
};

export type UpdateAccount = Partial<CreateAccount>;
