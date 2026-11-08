"use server";

import { parsePreferences } from "@/lib/preferences";
import { getToday, type TodayMenu } from "@/lib/today";

/**
 * Today's menus filtered by the caller's on-device preferences, with
 * `mealPeriod` (from `?meal=`) selected in each hall that serves it today.
 * Read-only and public (no accounts), but the input is untrusted, so it is
 * re-validated.
 */
export async function loadToday(preferences: unknown, mealPeriod?: unknown): Promise<TodayMenu> {
  return getToday({
    now: new Date(),
    mealPeriod: typeof mealPeriod === "string" ? mealPeriod : undefined,
    preferences: parsePreferences(preferences),
  });
}
