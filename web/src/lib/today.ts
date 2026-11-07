import { query } from "./db";

/**
 * Today data layer (server side): what each hall serves today, shaped the way
 * the home page renders it (hall -> meal period -> station -> item).
 *
 * Each hall gets a status at `now` and a current meal period: the one being
 * served, else the next one today. All times are America/New_York.
 *
 * Later slices extend this: preferences (favorites first, allergen/diet
 * filtering) and nutrition.
 */

export const DINING_TIME_ZONE = "America/New_York";

export type MenuItem = { name: string; recipeId: number };
export type Station = { name: string; items: MenuItem[] };
/** `start`/`end` are local wall-clock times "HH:MM", or null if UNC's label had no readable hours. */
export type MealPeriod = { name: string; start: string | null; end: string | null; stations: Station[] };

/**
 * - `serving`: `currentMealPeriod` is being served now.
 * - `opens-later`: nothing is served now; `currentMealPeriod` is the next one today.
 * - `done-for-today`: the last meal period has ended.
 * - `closed-today`: the hall is closed all day (UNC's page had no meal periods).
 * - `no-menu`: no menu has been scraped for today.
 */
export type HallStatus = "serving" | "opens-later" | "done-for-today" | "closed-today" | "no-menu";

export type Hall = {
  slug: string;
  name: string;
  status: HallStatus;
  /** The meal being served, else the next one today; null when done or closed. */
  currentMealPeriod: string | null;
  /** The meal to show: the requested one if this hall serves it today, else `currentMealPeriod`. */
  selectedMealPeriod: string | null;
  mealPeriods: MealPeriod[];
};
export type TodayMenu = { date: string; halls: Hall[] };

export type TodayOptions = {
  now: Date;
  /** A meal period the user switched to (by name), applied to each hall that serves it today. */
  mealPeriod?: string;
};

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

/** The wall-clock time ("HH:MM", 24-hour) in Chapel Hill at `now`. */
export function diningTime(now: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: DINING_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
}

/** The hall's status and current (or next) meal period at local time `time` ("HH:MM"). */
function currentMeal(
  menuStatus: string | null,
  mealPeriods: MealPeriod[],
  time: string,
): { status: HallStatus; current: string | null } {
  if (menuStatus === null) return { status: "no-menu", current: null };
  if (menuStatus === "closed" || mealPeriods.length === 0) return { status: "closed-today", current: null };
  // Zero-padded "HH:MM" strings compare correctly as text.
  const timed = mealPeriods.filter((mp) => mp.start !== null && mp.end !== null);
  const serving = timed.find((mp) => mp.start! <= time && time < mp.end!);
  if (serving) return { status: "serving", current: serving.name };
  const upcoming = timed.filter((mp) => mp.start! > time).sort((a, b) => a.start!.localeCompare(b.start!));
  if (upcoming.length > 0) return { status: "opens-later", current: upcoming[0].name };
  return { status: "done-for-today", current: null };
}

/** Postgres `time` comes back as "HH:MM:SS". */
const toHhmm = (t: string | null) => (t === null ? null : t.slice(0, 5));

type Row = {
  location_id: number;
  slug: string;
  location_name: string;
  menu_status: string | null;
  meal_period_id: number | null;
  meal_period_name: string | null;
  start_time: string | null;
  end_time: string | null;
  station_name: string | null;
  item_name: string | null;
  recipe_id: number | null;
};

type HallRows = { slug: string; name: string; menuStatus: string | null; mealPeriods: MealPeriod[] };

export async function getToday({ now, mealPeriod: requested }: TodayOptions): Promise<TodayMenu> {
  const date = diningDate(now);
  const rows = await query<Row>(
    `select l.id as location_id, l.slug, l.name as location_name, md.status as menu_status,
            mp.id as meal_period_id, mp.name as meal_period_name, mp.start_time, mp.end_time,
            s.name as station_name, mi.name as item_name, mi.recipe_id
     from location l
     left join menu_day md on md.location_id = l.id and md.date = $1
     left join meal_period mp on mp.menu_day_id = md.id
     left join menu_item mi on mi.meal_period_id = mp.id
     left join station s on s.id = mi.station_id
     order by l.id, mp.position, mi.position`,
    [date],
  );

  const halls = new Map<number, HallRows>();
  const mealPeriods = new Map<number, MealPeriod>();
  for (const row of rows) {
    let hall = halls.get(row.location_id);
    if (!hall) {
      hall = { slug: row.slug, name: row.location_name, menuStatus: row.menu_status, mealPeriods: [] };
      halls.set(row.location_id, hall);
    }
    if (row.meal_period_id === null) continue;

    let mealPeriod = mealPeriods.get(row.meal_period_id);
    if (!mealPeriod) {
      mealPeriod = {
        name: row.meal_period_name!,
        start: toHhmm(row.start_time),
        end: toHhmm(row.end_time),
        stations: [],
      };
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

  const time = diningTime(now);
  return {
    date,
    halls: [...halls.values()].map(({ slug, name, menuStatus, mealPeriods }) => {
      const { status, current } = currentMeal(menuStatus, mealPeriods, time);
      const selected = mealPeriods.some((mp) => mp.name === requested) ? requested! : current;
      return { slug, name, status, currentMealPeriod: current, selectedMealPeriod: selected, mealPeriods };
    }),
  };
}
