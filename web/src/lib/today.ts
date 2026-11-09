import { isAllergen, type Allergen } from "./allergens";
import { query } from "./db";
import { withSelectedMeal } from "./meal-periods";
import { DEFAULT_PREFERENCES, type Preferences } from "./preferences";

/**
 * Today data layer (server side): what each hall serves today, shaped the way
 * the home page renders it (hall -> meal period -> station -> item).
 *
 * Each hall gets a status at `now` and a current meal period: the one being
 * served, else the next one today. All times are America/New_York. Items carry
 * their recipe's main macros when its nutrition has been fetched, and their
 * dietary tags.
 *
 * `preferences` (the on-device settings, validated with `parsePreferences`)
 * filter what's returned. Both filters are strict cutoffs: an item missing any
 * filtered diet tag, or carrying any chosen allergen, is left out, as is a
 * station left with no items. Allergen filtering relies on UNC's labels only:
 * the UI must show `AllergenDisclaimer` alongside it. Favorites (matched by
 * normalized name) are flagged where they're served, listed together at the
 * top of each meal period (`MealPeriod.favorites`, with their station) and
 * counted per hall. Stations and items otherwise keep page order.
 */

export const DINING_TIME_ZONE = "America/New_York";

/**
 * The main macros of one serving, from the item's recipe nutrition. Amounts are
 * null when UNC's label leaves them blank. Full nutrition (fat breakdown,
 * micronutrients, ingredients) stays in `recipe_nutrition` for the detail view.
 */
export type ItemNutrition = {
  servingSize: string | null;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
};
/**
 * `dietaryTags` and `allergens` are UNC codes (see `dietary-tags.ts`,
 * `allergens.ts`), in page order. `dietaryTags` keeps codes UNC adds later
 * (shown with a humanized label), so it may hold more than `DietaryTag`;
 * `allergens` holds only the known `Allergen` codes the user can filter on.
 * `nutrition` is absent when the recipe's nutrition hasn't been fetched yet.
 */
export type MenuItem = {
  name: string;
  recipeId: number;
  /** How favorites match the dish across stations and halls (`favorites.ts`). */
  normalizedName: string;
  /** Whether `normalizedName` is one of the user's favorites. */
  favorite: boolean;
  dietaryTags: string[];
  allergens: Allergen[];
  nutrition?: ItemNutrition;
};
/**
 * `excludedFromCombos` is present (true) only for stations the scraper flagged
 * as not part of meal combos (condiments, beverages, cereal, ...).
 */
export type Station = { name: string; excludedFromCombos?: true; items: MenuItem[] };
/** A favorite dish as served at one station (a dish served at two stations is listed twice). */
export type FavoriteServing = { station: string; item: MenuItem };
/**
 * `start`/`end` are local wall-clock times "HH:MM", or null if UNC's label had no readable hours.
 * `favorites`: the favorite items among `stations`, in page order, for the top of the hall's list.
 */
export type MealPeriod = {
  name: string;
  start: string | null;
  end: string | null;
  favorites: FavoriteServing[];
  stations: Station[];
};

/** `menu_day.status`: whether UNC's page listed meal periods that day. */
type MenuStatus = "open" | "closed";

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
  /** Distinct favorites (by normalized name) shown in the selected meal period, after filters. */
  favoriteCount: number;
  mealPeriods: MealPeriod[];
};
export type TodayMenu = { date: string; halls: Hall[] };

export type TodayOptions = {
  now: Date;
  /** A meal period the user switched to (by name), applied to each hall that serves it today. */
  mealPeriod?: string;
  preferences?: Preferences;
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
  menuStatus: MenuStatus | null,
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
  menu_status: MenuStatus | null;
  meal_period_id: number | null;
  meal_period_name: string | null;
  start_time: string | null;
  end_time: string | null;
  station_name: string | null;
  station_excluded_from_combos: boolean | null;
  item_name: string | null;
  recipe_id: number | null;
  normalized_name: string | null;
  dietary_tags: string[] | null;
  allergens: string[] | null;
  has_nutrition: boolean;
  serving_size: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
};

type HallRows = { slug: string; name: string; menuStatus: MenuStatus | null; mealPeriods: MealPeriod[] };

export async function getToday({
  now,
  mealPeriod: requested,
  preferences = DEFAULT_PREFERENCES,
}: TodayOptions): Promise<TodayMenu> {
  const date = diningDate(now);
  const rows = await query<Row>(
    `select l.id as location_id, l.slug, l.name as location_name, md.status as menu_status,
            mp.id as meal_period_id, mp.name as meal_period_name, mp.start_time, mp.end_time,
            s.name as station_name, s.excluded_from_combos as station_excluded_from_combos, mi.name as item_name, mi.recipe_id,
            mi.normalized_name, mi.dietary_tags, mi.allergens,
            rn.recipe_id is not null as has_nutrition, rn.serving_size,
            rn.calories::float8 as calories, rn.protein_g::float8 as protein_g,
            rn.total_carbohydrate_g::float8 as carbs_g, rn.total_fat_g::float8 as fat_g
     from location l
     left join menu_day md on md.location_id = l.id and md.date = $1
     left join meal_period mp on mp.menu_day_id = md.id
     left join menu_item mi on mi.meal_period_id = mp.id
       and mi.dietary_tags @> $2::text[] -- diet filters: every one required
       and not (mi.allergens && $3::text[]) -- allergens: none of the chosen ones allowed
     left join station s on s.id = mi.station_id
     left join recipe_nutrition rn on rn.recipe_id = mi.recipe_id
     order by l.id, mp.position, mi.position`,
    [date, preferences.dietFilters, preferences.allergens],
  );

  const favoriteNames = new Set(preferences.favorites.map((f) => f.normalizedName));
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
        favorites: [],
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
      if (row.station_excluded_from_combos) station.excludedFromCombos = true;
      mealPeriod.stations.push(station);
    }
    const item: MenuItem = {
      name: row.item_name,
      recipeId: row.recipe_id!,
      normalizedName: row.normalized_name!,
      favorite: favoriteNames.has(row.normalized_name!),
      dietaryTags: row.dietary_tags!,
      allergens: row.allergens!.filter(isAllergen),
    };
    if (row.has_nutrition) {
      item.nutrition = {
        servingSize: row.serving_size,
        calories: row.calories,
        proteinG: row.protein_g,
        carbsG: row.carbs_g,
        fatG: row.fat_g,
      };
    }
    station.items.push(item);
    if (item.favorite) mealPeriod.favorites.push({ station: station.name, item });
  }

  const time = diningTime(now);
  return {
    date,
    halls: [...halls.values()].map(({ slug, name, menuStatus, mealPeriods }) => {
      const { status, current } = currentMeal(menuStatus, mealPeriods, time);
      const hall: Hall = {
        slug,
        name,
        status,
        currentMealPeriod: current,
        selectedMealPeriod: current,
        favoriteCount: 0,
        mealPeriods,
      };
      return withSelectedMeal(hall, requested);
    }),
  };
}
