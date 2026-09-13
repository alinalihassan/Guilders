const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isDateOnlyInput(value: string): boolean {
  return DATE_ONLY.test(value.trim());
}

export function isDateOnlyUtcTimestamp(date: Date): boolean {
  if (Number.isNaN(date.getTime())) return false;
  return (
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0 &&
    (date.getUTCHours() === 0 || date.getUTCHours() === 12)
  );
}

export function toUtcNoon(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0, 0),
  );
}

/** Parse provider dates. `YYYY-MM-DD` is stored at UTC noon so the calendar day stays stable. */
export function parseProviderTimestamp(value: string | Date | null | undefined): Date | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return isDateOnlyUtcTimestamp(value) ? toUtcNoon(value) : value;
  }
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const dateOnly = trimmed.match(DATE_ONLY);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);
    const parsed = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return isDateOnlyUtcTimestamp(parsed) ? toUtcNoon(parsed) : parsed;
}
