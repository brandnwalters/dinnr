import type { Station } from "./today";

/**
 * The condensed station preview on Today's hall cards: one line per station,
 * its first few dish names and how many more it has ("+N more"). Pure and
 * isomorphic, so it runs in the browser on the menu the app shell loaded.
 */

/** How many dish names a station's preview line shows. */
export const PREVIEW_DISHES = 3;

/** A station's preview line: the dish names shown, in menu order, and how many more there are. */
export type StationPreview = { names: string[]; more: number };

/** The first `limit` dish names of `station` and the count of the rest. */
export function stationPreview(station: Station, limit: number = PREVIEW_DISHES): StationPreview {
  const names = station.items.slice(0, limit).map((item) => item.name);
  return { names, more: station.items.length - names.length };
}
