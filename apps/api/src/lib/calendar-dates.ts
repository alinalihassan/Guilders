const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function todayUtcDate(): string {
  return utcDateKey(new Date());
}

export function utcDateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function parseUtcDate(value: string): Date {
  const match = value.trim().match(DATE_ONLY);
  if (!match) throw new Error(`Invalid date: ${value}`);
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

export function addUtcDays(value: string, days: number): string {
  const date = parseUtcDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return utcDateKey(date);
}

export function eachUtcDateInclusive(from: string, to: string): string[] {
  if (from > to) return [];
  const dates: string[] = [];
  for (let cursor = from; cursor <= to; cursor = addUtcDays(cursor, 1)) {
    dates.push(cursor);
  }
  return dates;
}

export function daysBetweenUtc(from: string, to: string): number {
  return Math.round((parseUtcDate(to).getTime() - parseUtcDate(from).getTime()) / 86_400_000);
}
