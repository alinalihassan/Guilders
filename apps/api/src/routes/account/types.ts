import { t } from "elysia";
import { AccountSubtypeEnum, AccountTypeEnum } from "../../db/schema/enums";

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
