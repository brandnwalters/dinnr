import type { Hall } from "./today";

/**
 * The shared meal-period list behind the meal-period switcher (Menus, Today,
 * Combos): pure, so it runs in the browser on the menu the app shell loaded.
 * `?meal=` names one entry and switches every hall that serves it.
 */

/**
 * Every meal period served today in any hall, once each, in serving order:
 * by start time (the earliest hall's), then the ones without readable hours in
 * the order their halls list them.
 */
export function mealPeriodNames(halls: readonly Hall[]): string[] {
  const starts = new Map<string, string | null>();
  for (const { mealPeriods } of halls) {
    for (const { name, start } of mealPeriods) {
      const known = starts.get(name);
      // Zero-padded "HH:MM" strings compare correctly as text.
      if (!starts.has(name) || (start !== null && (known == null || start < known))) starts.set(name, start);
    }
  }
  const names = [...starts.keys()];
  const timed = names.filter((name) => starts.get(name) != null);
  timed.sort((a, b) => starts.get(a)!.localeCompare(starts.get(b)!));
  return [...timed, ...names.filter((name) => starts.get(name) == null)];
}

/**
 * The meal period the switcher shows as selected: `requested` (from `?meal=`)
 * if any hall serves it today, else the current or next one (the earliest
 * across halls), else, once every hall is done, the day's last one. Null when
 * no hall serves anything today.
 */
export function selectedMealPeriod(halls: readonly Hall[], requested: string | null | undefined): string | null {
  const names = mealPeriodNames(halls);
  if (requested && names.includes(requested)) return requested;
  const current = new Set(halls.map((hall) => hall.currentMealPeriod));
  return names.find((name) => current.has(name)) ?? names.at(-1) ?? null;
}

/**
 * `hall` with `meal` selected if it serves it today, else its current (or
 * next) meal period; its favorite count follows the selected meal period.
 */
export function withSelectedMeal(hall: Hall, meal: string | null | undefined): Hall {
  const selected = hall.mealPeriods.some((mp) => mp.name === meal) ? meal! : hall.currentMealPeriod;
  const favorites = hall.mealPeriods.find((mp) => mp.name === selected)?.favorites ?? [];
  const favoriteCount = new Set(favorites.map(({ item }) => item.normalizedName)).size;
  return { ...hall, selectedMealPeriod: selected, favoriteCount };
}
