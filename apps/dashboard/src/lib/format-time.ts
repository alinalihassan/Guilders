
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
