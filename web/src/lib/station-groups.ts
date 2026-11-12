import type { MenuItem, Station } from "./today";

/**
 * Station grouping: how a meal period's stations are ordered and condensed so
 * the dishes a meal is built from come first. Each station is a main station,
 * a bar (a build-your-own station) or an extra (the add-ons the scraper flags
 * `excludedFromCombos`: condiments, spreads, beverages, cereal). Pure and
 * isomorphic, so it runs in the browser on the menu the app shell loaded.
 */

/** What a station is for: a main station, a build-your-own bar, or an extra. */
export type StationKind = "main" | "bar" | "extra";

/**
 * The bar rule: the word "bar" anywhere in the station's name, in any case
 * ("Salad Bar", "WAFFLE BAR", but not "Barbecue"). The one place to tune it.
 */
const BAR_NAME = /\bbar\b/i;

/** Whether `station` is an extra, a bar or a main station (the scraper's flag wins over the bar rule). */
export function stationKind(station: Station): StationKind {
  if (station.excludedFromCombos) return "extra";
  if (BAR_NAME.test(station.name)) return "bar";
  return "main";
}

/** A meal period's stations by kind, each in page order; stations with no dishes left after filters are dropped. */
export type StationGroups = { main: Station[]; bars: Station[]; extras: Station[] };

/** `stations` grouped as main stations, bars and Extras (shown in that order). */
export function groupStations(stations: readonly Station[]): StationGroups {
  const groups: StationGroups = { main: [], bars: [], extras: [] };
  const groupOf: Record<StationKind, Station[]> = { main: groups.main, bar: groups.bars, extra: groups.extras };
  for (const station of stations) {
    if (station.items.length > 0) groupOf[stationKind(station)].push(station);
  }
  return groups;
}

/** How many dishes a collapsed station shows. */
export const PREVIEW_DISHES = 3;

/** A collapsed station: the dishes `shown`, then the `rest` (in page order) that "Show all" adds. */
export type StationPreview = { shown: MenuItem[]; rest: MenuItem[] };

/**
 * `station`'s collapsed preview: its first `limit` dishes, favorites moved to
 * the front (unless `favoritesFirst` is false) and otherwise page order, and
 * the remaining dishes in page order.
 */
export function stationPreview(
  station: Station,
  { limit = PREVIEW_DISHES, favoritesFirst = true }: { limit?: number; favoritesFirst?: boolean } = {},
): StationPreview {
  const ordered = favoritesFirst
    ? [...station.items.filter((i) => i.favorite), ...station.items.filter((i) => !i.favorite)]
    : station.items;
  const shown = ordered.slice(0, limit);
  return { shown, rest: station.items.filter((i) => !shown.includes(i)) };
}

/**
 * One line of a Today card's preview: a main station with its first few
 * dishes (in page order) and how many `more` it has, or a bar summed up as
 * its `count` of dishes.
 */
export type TodayPreviewLine =
  | { kind: "station"; station: Station; shown: MenuItem[]; more: number }
  | { kind: "bar"; station: Station; count: number };

/** How many lines a Today card's preview shows at most. */
export const TODAY_PREVIEW_LINES = 5;

/**
 * A Today card's condensed preview of a meal period's `stations`: main
 * stations first, then bars as one-line summaries, capped at
 * `lines` lines (default `TODAY_PREVIEW_LINES`); Extras are left off.
 */
export function todayPreview(
  stations: readonly Station[],
  { lines = TODAY_PREVIEW_LINES }: { lines?: number } = {},
): TodayPreviewLine[] {
  const { main, bars } = groupStations(stations);
  return [
    ...main.map((station): TodayPreviewLine => {
      const { shown, rest } = stationPreview(station, { favoritesFirst: false });
      return { kind: "station", station, shown, more: rest.length };
    }),
    ...bars.map((station): TodayPreviewLine => ({ kind: "bar", station, count: station.items.length })),
  ].slice(0, lines);
}

/** A New today dish as served at one station. */
export type NewTodayServing = { station: string; item: MenuItem };

/**
 * The New today dishes among `stations` (any kind), in page order, each
 * listed once (at its first station) when it's served at more than one.
 */
export function newTodayDishes(stations: readonly Station[]): NewTodayServing[] {
  const seen = new Set<string>();
  const dishes: NewTodayServing[] = [];
  for (const station of stations) {
    for (const item of station.items) {
      if (!item.newToday || seen.has(item.normalizedName)) continue;
      seen.add(item.normalizedName);
      dishes.push({ station: station.name, item });
    }
  }
  return dishes;
}
