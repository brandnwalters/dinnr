/**
 * The dining day: the calendar date in Chapel Hill. Pure and isomorphic, so the
 * browser (the meal log) and the server (the Today data layer) agree on it.
 */

export const DINING_TIME_ZONE = "America/New_York";

/** The calendar date (YYYY-MM-DD) in Chapel Hill at `now`; it rolls over at local midnight. */
export function diningDate(now: Date): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DINING_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** "Tue Nov 3" for a dining date "2026-11-03" (a calendar date, so read in UTC to keep the day). */
export function shortDiningDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" })
    .format(new Date(`${date}T12:00:00Z`))
    .replace(",", "");
}
