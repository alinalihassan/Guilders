export type LockedAttributes<TField extends string = string> = Partial<Record<TField, boolean>>;

export type AccountLockableField =
  | "cost"
  | "currency"
  | "image"
  | "institution_connection_id"
  | "investable"
  | "name"
  | "parent"
  | "provider_account_id"
  | "subtype"
  | "tax_rate"
  | "taxability"
  | "ticker"
  | "type"
  | "units"
  | "value"
  | "notes"
  | "documents";

export type TransactionLockableField =
  | "account_id"
  | "amount"
  | "category_id"
  | "currency"
  | "date"
  | "description"
  | "provider_transaction_id"
  | "documents";

export function createLockedAttributes<TField extends string>(
  fields: readonly TField[],
): LockedAttributes<TField> {
  return fields.reduce<LockedAttributes<TField>>((acc, field) => {
    acc[field] = true;
    return acc;
  }, {});
}

export function isFieldLocked(
  lockedAttributes: LockedAttributes | null | undefined,
  field: string,
): boolean {
  return lockedAttributes?.[field] === true;
}

export function filterLockedUpdate<T extends Record<string, unknown>>(
  update: T,
  lockedAttributes: LockedAttributes | null | undefined,
): { allowed: Partial<T>; blocked: (keyof T)[] } {
  const allowed: Partial<T> = {};
  const blocked: (keyof T)[] = [];

  for (const [key, value] of Object.entries(update)) {
    if (value === undefined) continue;

    if (isFieldLocked(lockedAttributes, key)) {
      blocked.push(key as keyof T);
      continue;
    }

    allowed[key as keyof T] = value as T[keyof T];
  }

  return { allowed, blocked };
}

const SYNCED_ACCOUNT_LOCKED_FIELDS: readonly AccountLockableField[] = [
  "cost",
  "currency",
  "image",
  "institution_connection_id",
  "investable",
  "name",
  "parent",
  "provider_account_id",
  "subtype",
  "tax_rate",
  "taxability",
  "ticker",
  "type",
  "units",
  "value",
] as const;

const SYNCED_TRANSACTION_LOCKED_FIELDS: readonly TransactionLockableField[] = [
  "account_id",
  "amount",
  "category_id",
  "currency",
  "date",
  "description",
  "provider_transaction_id",
] as const;

export const SYNCED_ACCOUNT_LOCKED_ATTRIBUTES = createLockedAttributes(
  SYNCED_ACCOUNT_LOCKED_FIELDS,
);

export const SYNCED_TRANSACTION_LOCKED_ATTRIBUTES = createLockedAttributes(
  SYNCED_TRANSACTION_LOCKED_FIELDS,
);
