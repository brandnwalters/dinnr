import { query } from "./db";

/**
 * Served history (server side): what the saved menu days say about the dishes
 * served on a dining date: when each was last served before it (at any hall),
 * and which ones each hall has served lately (for New today).
 */

/** A dish is New today when its hall served nothing with its normalized name in this many days before today. */
export const NEW_TODAY_WINDOW_DAYS = 14;
/** New today is off at a hall until it has at least this many saved menu days before today. */
export const NEW_TODAY_MIN_HISTORY_DAYS = 14;

/**
 * A dish's most recent serving before today: its dining date (YYYY-MM-DD),
 * meal period and hall. Taken from the saved menu days whatever the filters;
 * today's own servings never count.
 */
export type LastServed = { date: string; mealPeriod: string; hallSlug: string; hallName: string };

/**
 * SQL subquery: the normalized names served on the date in `$1`, at any hall,
 * or only at the hall in the column `atHall` (e.g. "md.location_id") when given.
 */
function namesServedOn(atHall?: string): string {
  return `select t.normalized_name from menu_item t
          join meal_period tmp on tmp.id = t.meal_period_id
          join menu_day tmd on tmd.id = tmp.menu_day_id
          where tmd.date = $1${atHall ? ` and tmd.location_id = ${atHall}` : ""}`;
}

type LastServedRow = {
  normalized_name: string;
  date: string;
  meal_period_name: string;
  slug: string;
  location_name: string;
};

/**
 * The most recent serving before `date`, at any hall, of each dish served on
 * `date` and of each of `extraNames` (all by normalized name). Within one day
 * the later meal period wins; a tie across halls goes to the first hall.
 */
export async function lastServedBefore(date: string, extraNames: string[]): Promise<Map<string, LastServed>> {
  const rows = await query<LastServedRow>(
    `select distinct on (mi.normalized_name)
            mi.normalized_name, to_char(md.date, 'YYYY-MM-DD') as date, mp.name as meal_period_name,
            l.slug, l.name as location_name
     from menu_item mi
     join meal_period mp on mp.id = mi.meal_period_id
     join menu_day md on md.id = mp.menu_day_id
     join location l on l.id = md.location_id
     where md.date < $1
       and (mi.normalized_name = any($2::text[]) or mi.normalized_name in (${namesServedOn()}))
     order by mi.normalized_name, md.date desc, mp.position desc, l.id`,
    [date, extraNames],
  );
  return new Map(
    rows.map((r) => [
      r.normalized_name,
      { date: r.date, mealPeriod: r.meal_period_name, hallSlug: r.slug, hallName: r.location_name },
    ]),
  );
}

/**
 * For each hall with at least `NEW_TODAY_MIN_HISTORY_DAYS` saved menu days
 * before `date`, the normalized names it served in the `NEW_TODAY_WINDOW_DAYS`
 * before `date` (only those it also serves on `date`). Halls with less history
 * are left out: nothing there is New today.
 */
export async function recentlyServedBefore(date: string): Promise<Map<number, Set<string>>> {
  const rows = await query<{ location_id: number; recent: string[] }>(
    `select md.location_id,
            coalesce(array_agg(distinct mi.normalized_name)
                       filter (where md.date >= $1::date - $2::int
                               and mi.normalized_name in (${namesServedOn("md.location_id")})),
                     '{}') as recent
     from menu_day md
     left join meal_period mp on mp.menu_day_id = md.id
     left join menu_item mi on mi.meal_period_id = mp.id
     where md.date < $1
     group by md.location_id
     having count(distinct md.id) >= $3`,
    [date, NEW_TODAY_WINDOW_DAYS, NEW_TODAY_MIN_HISTORY_DAYS],
  );
  return new Map(rows.map((r) => [r.location_id, new Set(r.recent)]));
}
