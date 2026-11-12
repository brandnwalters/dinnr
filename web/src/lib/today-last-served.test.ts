// Seam 3: last served in the Today data layer (the most recent earlier day either hall served a dish, by normalized name).
import { afterAll, beforeEach, expect, test } from "vitest";
import { resetDb, seedMenuDay, type SeedMealPeriod } from "../../test/seed";
import { closeDb } from "./db";
import { DEFAULT_PREFERENCES, type Preferences } from "./preferences";
import { getToday, type MenuItem, type TodayMenu } from "./today";

const LENOIR = { slug: "top-of-lenoir", name: "Top of Lenoir" };
const CHASE = { slug: "chase", name: "Chase" };
const SAT_LUNCHTIME = new Date("2026-11-07T17:30:00Z"); // 12:30 in Chapel Hill on Sat Nov 7

beforeEach(resetDb);
afterAll(closeDb);

const meal = (name: string, items: string[], station = "The Grill"): SeedMealPeriod => ({
  name,
  start: name === "Dinner" ? "17:00" : "11:00",
  end: name === "Dinner" ? "20:00" : "15:00",
  stations: [{ name: station, items: items.map((item, i) => ({ name: item, recipeId: 100 + i })) }],
});

const item = (menu: TodayMenu, hall: string, name: string): MenuItem =>
  menu.halls
    .find((h) => h.name === hall)!
    .mealPeriods.flatMap((mp) => mp.stations.flatMap((s) => s.items))
    .find((i) => i.name === name)!;

const favorites = (...names: string[]): Preferences => ({
  ...DEFAULT_PREFERENCES,
  favorites: names.map((name) => ({ name, normalizedName: name.toLowerCase() })),
});

test("an item carries the most recent earlier day, meal period and hall it was served", async () => {
  await seedMenuDay({ location: LENOIR, date: "2026-10-30", mealPeriods: [meal("Lunch", ["Waffle"])] });
  await seedMenuDay({ location: CHASE, date: "2026-11-03", mealPeriods: [meal("Lunch", ["Waffle"]), meal("Dinner", ["Waffle"])] });
  await seedMenuDay({ location: LENOIR, date: "2026-11-01", mealPeriods: [meal("Dinner", ["Waffle"])] });
  await seedMenuDay({ location: LENOIR, date: "2026-11-07", mealPeriods: [meal("Lunch", ["Waffle"])] });

  const menu = await getToday({ now: SAT_LUNCHTIME });

  expect(item(menu, "Top of Lenoir", "Waffle").lastServed).toEqual({
    date: "2026-11-03",
    mealPeriod: "Dinner",
    hallSlug: "chase",
    hallName: "Chase",
  });
});

test("matching uses the normalized name, so the dish at another station or hall counts", async () => {
  await seedMenuDay({
    location: CHASE,
    date: "2026-11-05",
    mealPeriods: [meal("Lunch", ["GRILLED  chicken Breast"], "Hot Line")],
  });
  await seedMenuDay({ location: LENOIR, date: "2026-11-07", mealPeriods: [meal("Lunch", ["Grilled Chicken Breast"])] });

  const menu = await getToday({ now: SAT_LUNCHTIME });

  expect(item(menu, "Top of Lenoir", "Grilled Chicken Breast").lastServed).toEqual({
    date: "2026-11-05",
    mealPeriod: "Lunch",
    hallSlug: "chase",
    hallName: "Chase",
  });
});

test("with no earlier record lastServed is absent: today's own servings and later days never count", async () => {
  await seedMenuDay({ location: LENOIR, date: "2026-11-07", mealPeriods: [meal("Lunch", ["Waffle"]), meal("Dinner", ["Waffle"])] });
  await seedMenuDay({ location: CHASE, date: "2026-11-07", mealPeriods: [meal("Lunch", ["Waffle"])] });
  // Saved under tomorrow's date after UNC's evening rollover.
  await seedMenuDay({ location: CHASE, date: "2026-11-08", mealPeriods: [meal("Lunch", ["Waffle"])] });

  const menu = await getToday({ now: SAT_LUNCHTIME });

  expect(item(menu, "Top of Lenoir", "Waffle")).not.toHaveProperty("lastServed");
  expect(item(menu, "Chase", "Waffle")).not.toHaveProperty("lastServed");
});

test("the menu carries last served for each favorite, including favorites not served today", async () => {
  await seedMenuDay({ location: CHASE, date: "2026-11-02", mealPeriods: [meal("Dinner", ["Sushi Roll"])] });
  await seedMenuDay({ location: LENOIR, date: "2026-11-04", mealPeriods: [meal("Lunch", ["Waffle"])] });
  await seedMenuDay({ location: LENOIR, date: "2026-11-07", mealPeriods: [meal("Lunch", ["Waffle"])] });

  const menu = await getToday({ now: SAT_LUNCHTIME, preferences: favorites("Sushi Roll", "Waffle", "Never Served") });

  expect(menu.favoritesLastServed).toEqual({
    "sushi roll": { date: "2026-11-02", mealPeriod: "Dinner", hallSlug: "chase", hallName: "Chase" },
    waffle: { date: "2026-11-04", mealPeriod: "Lunch", hallSlug: "top-of-lenoir", hallName: "Top of Lenoir" },
  });
});

test("last served ignores the diet and allergen filters", async () => {
  await seedMenuDay({ location: CHASE, date: "2026-11-02", mealPeriods: [meal("Dinner", ["Sushi Roll"])] });

  const menu = await getToday({
    now: SAT_LUNCHTIME,
    preferences: { ...favorites("Sushi Roll"), dietFilters: ["vegan"] },
  });

  expect(menu.favoritesLastServed["sushi roll"]).toMatchObject({ date: "2026-11-02" });
});
