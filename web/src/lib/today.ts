import { query } from "./db";

/**
 * Today data layer (server side): what each hall serves today, shaped the way
 * the home page renders it (hall -> meal period -> station -> item).
 *
 * Later slices extend this: hours/status and current-vs-next meal (from `now`),
 * preferences (favorites first, allergen/diet filtering) and nutrition.
 */

export const DINING_TIME_ZONE = "America/New_York";

export type MenuItem = { name: string; recipeId: number };
export type Station = { name: string; items: MenuItem[] };
export type MealPeriod = { name: string; stations: Station[] };
export type Hall = { slug: string; name: string; mealPeriods: MealPeriod[] };
export type TodayMenu = { date: string; halls: Hall[] };

export type TodayOptions = { now: Date };

/** The calendar date (YYYY-MM-DD) in Chapel Hill at `now`. */
export function diningDate(now: Date): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DINING_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

type Row = {
  location_id: number;
  slug: string;
  location_name: string;
  meal_period_id: number | null;
  meal_period_name: string | null;
  station_name: string | null;
  item_name: string | null;
  recipe_id: number | null;
};

export async function getToday({ now }: TodayOptions): Promise<TodayMenu> {
  const date = diningDate(now);
  const rows = await query<Row>(
    `select l.id as location_id, l.slug, l.name as location_name,
            mp.id as meal_period_id, mp.name as meal_period_name,
            s.name as station_name, mi.name as item_name, mi.recipe_id
     from location l
     left join menu_day md on md.location_id = l.id and md.date = $1
     left join meal_period mp on mp.menu_day_id = md.id
     left join menu_item mi on mi.meal_period_id = mp.id
     left join station s on s.id = mi.station_id
     order by l.id, mp.position, mi.position`,
    [date],
  );

  const halls = new Map<number, Hall>();
  const mealPeriods = new Map<number, MealPeriod>();
  for (const row of rows) {
    let hall = halls.get(row.location_id);
    if (!hall) {
      hall = { slug: row.slug, name: row.location_name, mealPeriods: [] };
      halls.set(row.location_id, hall);
    }
    if (row.meal_period_id === null) continue;

    let mealPeriod = mealPeriods.get(row.meal_period_id);
    if (!mealPeriod) {
      mealPeriod = { name: row.meal_period_name!, stations: [] };
      mealPeriods.set(row.meal_period_id, mealPeriod);
      hall.mealPeriods.push(mealPeriod);
    }
    if (row.item_name === null) continue;

    // Items are in page order, so a station's items are contiguous.
    let station = mealPeriod.stations.at(-1);
    if (station?.name !== row.station_name) {
      station = { name: row.station_name!, items: [] };
      mealPeriod.stations.push(station);
    }
    station.items.push({ name: row.item_name, recipeId: row.recipe_id! });
  }

  return { date, halls: [...halls.values()] };
}
