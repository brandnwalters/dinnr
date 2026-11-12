import type { MenuItem, TodayMenu } from "./today";

/**
 * Search (the header's search sheet): today's dishes across every hall and
 * meal period whose name contains the query, regardless of case. Pure and
 * isomorphic: it runs in the browser on the `TodayMenu` the app shell already
 * loaded, so typing needs no server call.
 *
 * The diet and allergen filters already applied to that menu (`getToday`), so
 * filtered-out dishes never appear; the names they hid
 * (`MealPeriod.hiddenByFilters`) are matched the same way to count them.
 */

/** One dish as served at one station (a dish served at two stations is two results). */
export type SearchResult = { station: string; item: MenuItem };
export type SearchMealGroup = { name: string; results: SearchResult[] };
export type SearchHallGroup = { slug: string; name: string; mealPeriods: SearchMealGroup[] };

export type DishSearch = {
  /** Halls with matches, in menu order; within each, meal periods with matches, in menu order. */
  halls: SearchHallGroup[];
  /** How many results there are in all. */
  count: number;
  /** How many more dishes would match without the diet and allergen filters. */
  hidden: number;
};

export function searchDishes(query: string, menu: TodayMenu): DishSearch {
  const needle = query.trim().toLowerCase();
  if (needle === "") return { halls: [], count: 0, hidden: 0 };
  const matches = (name: string) => name.toLowerCase().includes(needle);
  const halls: SearchHallGroup[] = [];
  let count = 0;
  let hidden = 0;
  for (const hall of menu.halls) {
    const mealPeriods: SearchMealGroup[] = [];
    for (const mealPeriod of hall.mealPeriods) {
      const results = mealPeriod.stations.flatMap((station) =>
        station.items.filter((item) => matches(item.name)).map((item) => ({ station: station.name, item })),
      );
      count += results.length;
      hidden += (mealPeriod.hiddenByFilters ?? []).filter(matches).length;
      if (results.length > 0) mealPeriods.push({ name: mealPeriod.name, results });
    }
    if (mealPeriods.length > 0) halls.push({ slug: hall.slug, name: hall.name, mealPeriods });
  }
  return { halls, count, hidden };
}
