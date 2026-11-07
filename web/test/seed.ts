import { query } from "@/lib/db";

/**
 * Test seeding for the web app's data layer (Seam 3). Writes rows the way the
 * scraper would, through the shared schema. Extend the input types (and the
 * inserts) as later tickets add columns.
 */

export type SeedItem = { name: string; recipeId: number };
export type SeedStation = { name: string; items: SeedItem[] };
export type SeedMealPeriod = { name: string; stations: SeedStation[] };
export type SeedLocation = { slug: string; name: string; url?: string };
export type SeedMenuDay = { location: SeedLocation; date: string; mealPeriods: SeedMealPeriod[] };

export type SeedNutrition = {
  recipeId: number;
  servingSize?: string | null;
  calories?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  fetchedAt?: string;
};

/** Seed one recipe's nutrition (a recipe_nutrition row, as the scraper saves it). */
export async function seedNutrition(n: SeedNutrition): Promise<void> {
  await query(
    `insert into recipe_nutrition
       (recipe_id, serving_size, calories, protein_g, total_carbohydrate_g, total_fat_g, fetched_at)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [
      n.recipeId,
      n.servingSize ?? null,
      n.calories ?? null,
      n.proteinG ?? null,
      n.carbsG ?? null,
      n.fatG ?? null,
      n.fetchedAt ?? "2026-11-07T14:00:00Z",
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
    "insert into menu_day (location_id, date) values ($1, $2) returning id",
    [locationId, day.date],
  );
  for (const [mpPosition, mealPeriod] of day.mealPeriods.entries()) {
    const [mp] = await query<{ id: number }>(
      "insert into meal_period (menu_day_id, name, position) values ($1, $2, $3) returning id",
      [menuDay.id, mealPeriod.name, mpPosition],
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
          `insert into menu_item (meal_period_id, station_id, recipe_id, name, position)
           values ($1, $2, $3, $4, $5)`,
          [mp.id, st.id, item.recipeId, item.name, position++],
        );
      }
    }
  }
}
