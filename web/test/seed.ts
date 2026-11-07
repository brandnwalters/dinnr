import { query } from "@/lib/db";

/**
 * Test seeding for the web app's data layer (Seam 3). Writes rows the way the
 * scraper would, through the shared schema. Extend the input types (and the
 * inserts) as later tickets add columns.
 */

export type SeedItem = { name: string; recipeId: number };
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
          `insert into menu_item (meal_period_id, station_id, recipe_id, name, position)
           values ($1, $2, $3, $4, $5)`,
          [mp.id, st.id, item.recipeId, item.name, position++],
        );
      }
    }
  }
}
