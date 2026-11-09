/**
 * Menus deep links: the one place that knows how a link into the Menus tab is
 * spelled, so the Menus station chips and Today's hall cards can't drift
 * apart. Pure and isomorphic.
 *
 * A link is `/menus?hall=<slug>&meal=<meal-period name>#<station anchor>`:
 * `hall` picks the hall on phones, `meal` switches every hall to that meal
 * period, and the fragment is the station's id on the Menus screen
 * (`stationAnchorId`), so the page lands on that station.
 */

/** Where a Menus deep link goes: a hall (slug), optionally a meal period (name) and a station (name). */
export type MenusLinkTarget = {
  hall: string;
  meal?: string | null;
  station?: string | null;
};

/**
 * The Menus URL for `target`, e.g.
 * `menusHref({ hall: "chase", meal: "Late Lunch", station: "Wok" })` is
 * `/menus?hall=chase&meal=Late+Lunch#station-chase-wok`. Leave out `meal` for
 * the hall's default meal period, and `station` to land at the top.
 */
export function menusHref({ hall, meal, station }: MenusLinkTarget): string {
  const query = new URLSearchParams({ hall });
  if (meal) query.set("meal", meal);
  return `/menus?${query}${station ? `#${stationAnchorId(hall, station)}` : ""}`;
}

/**
 * The id of `station`'s section in `hall`'s column on the Menus screen, e.g.
 * `station-top-of-lenoir-grill`. It includes the hall because desktop shows
 * every hall at once and halls share station names.
 */
export function stationAnchorId(hall: string, station: string): string {
  return `station-${hall}-${slug(station)}`;
}

/** "Café Crêpes & Co" -> "cafe-crepes-co"; a name with no letters or digits falls back to its code points. */
function slug(name: string): string {
  const words = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return words || [...name].map((char) => char.codePointAt(0)!.toString(36)).join("-");
}
