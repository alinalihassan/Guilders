import { useUser } from "@/lib/queries/useUser";

/**
 * Format a date's time portion according to user preference (12h AM/PM or 24h).
 * Uses a stable locale (en-US) so only 12/24 varies.
 */
export function formatTime(
  date: Date,
  timeFormat: "12" | "24",
  options?: { showSeconds?: boolean },
): string {
  return date.toLocaleTimeString("en-US", {
    hour12: timeFormat === "12",
    hour: "2-digit",
    minute: "2-digit",
    ...(options?.showSeconds && { second: "2-digit" }),
  });
}

/** Format time using the current user's time format preference. Defaults to 24h when user is not loaded. */
export function useFormattedTime(date: Date, options?: { showSeconds?: boolean }): string {
  const { data: user } = useUser();
  return formatTime(date, user?.timeFormat ?? "24", options);
}

/** Bank feeds often send a date with no time. Midnight or noon UTC means "date only". */
export function isDateOnlyTimestamp(date: Date): boolean {
  if (Number.isNaN(date.getTime())) return false;
  return (
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0 &&
    (date.getUTCHours() === 0 || date.getUTCHours() === 12)
  );
}

export function formatTransactionDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (isDateOnlyTimestamp(date)) {
    return date.toLocaleDateString(undefined, { timeZone: "UTC" });
  }
  return date.toLocaleDateString();
}
