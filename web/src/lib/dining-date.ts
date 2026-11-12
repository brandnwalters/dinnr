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
