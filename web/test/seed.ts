import { query } from "@/lib/db";
import { normalizeName } from "@/lib/favorites";

/**
 * Test seeding for the web app's data layer (Seam 3). Writes rows the way the
 * scraper would, through the shared schema. Extend the input types (and the
 * inserts) as later tickets add columns.
 */

/** `normalizedName` defaults to the scraper's rule applied to `name`. */
export type SeedItem = {
  name: string;
  recipeId: number;
  dietaryTags?: string[];
  allergens?: string[];
  normalizedName?: string;
};
export type SeedStation = { name: string; items: SeedItem[] };
/** `start`/`end` are local wall-clock times ("HH:MM"); omit for a label without hours. */
export type SeedMealPeriod = { name: string; start?: string; end?: string; stations: SeedStation[] };
export type SeedLocation = { slug: string; name: string; url?: string };
export type SeedMenuDay = {
  location: SeedLocation;
  date: string;
  /** Defaults to "closed" when there are no meal periods, as the scraper saves it. */
  status?: "open" | "closed";
  mealPeriods: SeedMealPeriod[];
};

export type SeedNutrition = {
  recipeId: number;
  servingSize?: string | null;
  calories?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  fetchedAt?: string;
  // The rest of the label, for the nutrition detail panel.
  name?: string | null;
  saturatedFatG?: number | null;
  transFatG?: number | null;
  cholesterolMg?: number | null;
  sodiumMg?: number | null;
  fiberG?: number | null;
  sugarsG?: number | null;
  addedSugarG?: number | null;
  micronutrients?: { name: string; amount: number | null; unit: string }[];
  ingredients?: string | null;
};

/** Seed one recipe's nutrition (a recipe_nutrition row, as the scraper saves it). */
export async function seedNutrition(n: SeedNutrition): Promise<void> {
  await query(
    `insert into recipe_nutrition
       (recipe_id, serving_size, calories, protein_g, total_carbohydrate_g, total_fat_g, fetched_at,
        name, saturated_fat_g, trans_fat_g, cholesterol_mg, sodium_mg, dietary_fiber_g, sugars_g,
        added_sugar_g, micronutrients, ingredients)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
    [
      n.recipeId,
      n.servingSize ?? null,
      n.calories ?? null,
      n.proteinG ?? null,
      n.carbsG ?? null,
      n.fatG ?? null,
      n.fetchedAt ?? "2026-11-07T14:00:00Z",
      n.name ?? null,
      n.saturatedFatG ?? null,
      n.transFatG ?? null,
      n.cholesterolMg ?? null,
      n.sodiumMg ?? null,
      n.fiberG ?? null,
      n.sugarsG ?? null,
      n.addedSugarG ?? null,
      JSON.stringify(n.micronutrients ?? []),
      n.ingredients ?? null,
    ],
  );
}

/** Empty every app table (all but schema_migrations). */
export async function resetDb(): Promise<void> {
  const tables = await query<{ tablename: string }>(
    "select tablename from pg_tables where schemaname = 'public' and tablename <> 'schema_migrations'",
  );
  if (tables.length === 0) return;
  const list = tables.map((t) => `"${t.tablename}"`).join(", ");
  await query(`truncate ${list} restart identity cascade`);
}

export async function seedLocation(location: SeedLocation): Promise<number> {
  const [row] = await query<{ id: number }>(
    `insert into location (slug, name, url) values ($1, $2, $3)
     on conflict (slug) do update set name = excluded.name
     returning id`,
    [location.slug, location.name, location.url ?? `https://dining.unc.edu/locations/${location.slug}/`],
  );
  return row.id;
}

/** Seed one location's menu for one date. Array order becomes page order. */
export async function seedMenuDay(day: SeedMenuDay): Promise<void> {
  const locationId = await seedLocation(day.location);
  const [menuDay] = await query<{ id: number }>(
    "insert into menu_day (location_id, date, status) values ($1, $2, $3) returning id",
    [locationId, day.date, day.status ?? (day.mealPeriods.length === 0 ? "closed" : "open")],
  );
  for (const [mpPosition, mealPeriod] of day.mealPeriods.entries()) {
    const [mp] = await query<{ id: number }>(
      `insert into meal_period (menu_day_id, name, position, start_time, end_time)
       values ($1, $2, $3, $4, $5) returning id`,
      [menuDay.id, mealPeriod.name, mpPosition, mealPeriod.start ?? null, mealPeriod.end ?? null],
    );
    let position = 0;
    for (const station of mealPeriod.stations) {
      const [st] = await query<{ id: number }>(
        `insert into station (name) values ($1)
         on conflict (name) do update set name = excluded.name returning id`,
        [station.name],
      );
      for (const item of station.items) {
        await query(
          `insert into menu_item
             (meal_period_id, station_id, recipe_id, name, position, dietary_tags, allergens, normalized_name)
           values ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            mp.id,
            st.id,
            item.recipeId,
            item.name,
            position++,
            item.dietaryTags ?? [],
            item.allergens ?? [],
            item.normalizedName ?? normalizeName(item.name),
          ],
        );
      }
    }
  }
}
