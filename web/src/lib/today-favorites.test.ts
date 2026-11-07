// Seam 3: favorites in the Today data layer (matched by normalized name, shown first, counted per hall).
import { afterAll, beforeEach, expect, test } from "vitest";
import { resetDb, seedMenuDay, type SeedStation } from "../../test/seed";
import { closeDb } from "./db";
import { DEFAULT_PREFERENCES, type Preferences } from "./preferences";
import { getToday, type Hall } from "./today";

const LENOIR = { slug: "top-of-lenoir", name: "Top of Lenoir" };
const CHASE = { slug: "chase", name: "Chase" };
const SAT_LUNCHTIME = new Date("2026-11-07T17:30:00Z"); // 12:30 in Chapel Hill

beforeEach(resetDb);
afterAll(closeDb);

const brunch = (location: typeof LENOIR, stations: SeedStation[]) =>
  seedMenuDay({ location, date: "2026-11-07", mealPeriods: [{ name: "Brunch", start: "11:00", end: "15:00", stations }] });

async function seedBothHalls() {
  await brunch(LENOIR, [
    {
      name: "Waffle Bar",
      items: [
        { name: "Waffle", recipeId: 8260 },
        { name: "Pancake Syrup", recipeId: 10329 },
      ],
    },
    {
      name: "The Grill",
      items: [
        { name: "Nashville Hot Chicken Biscuit", recipeId: 15469 },
        { name: "Grilled Chicken Breast", recipeId: 13708 },
        { name: "Black Bean Burger Patty", recipeId: 5810, dietaryTags: ["vegan"] },
      ],
    },
  ]);
  // Chase serves the same dish under another recipe id, spelled differently.
  await brunch(CHASE, [
    { name: "Pizza", items: [{ name: "Cheese Pizza", recipeId: 7717 }] },
    {
      name: "Hot Line",
      items: [{ name: "GRILLED  chicken Breast", recipeId: 20001, normalizedName: "grilled chicken breast" }],
    },
  ]);
}

const favorites = (...names: string[]): Preferences => ({
  ...DEFAULT_PREFERENCES,
  favorites: names.map((name) => ({ name, normalizedName: name.toLowerCase() })),
});

const brunchOf = (hall: Hall) => hall.mealPeriods.find((mp) => mp.name === "Brunch")!;
const layout = (hall: Hall) => brunchOf(hall).stations.map((s) => [s.name, s.items.map((i) => i.name)]);

test("items carry their normalized name and whether they're a favorite", async () => {
  await seedBothHalls();

  const [lenoir, chase] = (await getToday({ now: SAT_LUNCHTIME, preferences: favorites("Waffle") })).halls;

  const items = brunchOf(lenoir).stations.flatMap((s) => s.items);
  expect(items.find((i) => i.name === "Waffle")).toMatchObject({ normalizedName: "waffle", favorite: true });
  expect(items.find((i) => i.name === "Pancake Syrup")).toMatchObject({
    normalizedName: "pancake syrup",
    favorite: false,
  });
  expect(brunchOf(chase).stations[1].items[0]).toMatchObject({
    name: "GRILLED  chicken Breast",
    normalizedName: "grilled chicken breast",
    favorite: false,
  });
});

test("with no favorites, page order is kept and nothing is counted", async () => {
  await seedBothHalls();

  const [lenoir] = (await getToday({ now: SAT_LUNCHTIME })).halls;

  expect(lenoir.favoriteCount).toBe(0);
  expect(layout(lenoir)).toEqual([
    ["Waffle Bar", ["Waffle", "Pancake Syrup"]],
    ["The Grill", ["Nashville Hot Chicken Biscuit", "Grilled Chicken Breast", "Black Bean Burger Patty"]],
  ]);
});

test("favorites come first: stations serving one lead, and favorites lead their station", async () => {
  await seedBothHalls();

  const [lenoir, chase] = (
    await getToday({ now: SAT_LUNCHTIME, preferences: favorites("Grilled Chicken Breast") })
  ).halls;

  expect(layout(lenoir)).toEqual([
    ["The Grill", ["Grilled Chicken Breast", "Nashville Hot Chicken Biscuit", "Black Bean Burger Patty"]],
    ["Waffle Bar", ["Waffle", "Pancake Syrup"]],
  ]);
  expect(layout(chase)).toEqual([
    ["Hot Line", ["GRILLED  chicken Breast"]],
    ["Pizza", ["Cheese Pizza"]],
  ]);
});

test("a favorite matches the same dish in both halls, whatever its recipe id or spelling", async () => {
  await seedBothHalls();

  const [lenoir, chase] = (
    await getToday({ now: SAT_LUNCHTIME, preferences: favorites("Grilled Chicken Breast") })
  ).halls;

  expect(brunchOf(lenoir).stations[0].items[0]).toMatchObject({ recipeId: 13708, favorite: true });
  expect(brunchOf(chase).stations[0].items[0]).toMatchObject({ recipeId: 20001, favorite: true });
  expect([lenoir.favoriteCount, chase.favoriteCount]).toEqual([1, 1]);
});

test("each hall counts the distinct favorites it serves in the selected meal", async () => {
  await seedBothHalls();
  // Lenoir's Dinner serves another favorite; it doesn't count while Brunch is selected.
  await seedMenuDay({
    location: { slug: "rams-head", name: "Ram's Head" },
    date: "2026-11-07",
    mealPeriods: [
      { name: "Brunch", start: "11:00", end: "15:00", stations: [{ name: "Grill", items: [{ name: "Waffle", recipeId: 1 }, { name: "Waffle", recipeId: 2 }] }] },
      { name: "Dinner", start: "17:00", end: "20:00", stations: [{ name: "Grill", items: [{ name: "Cheese Pizza", recipeId: 7717 }] }] },
    ],
  });
  const prefs = favorites("Waffle", "Grilled Chicken Breast", "Cheese Pizza", "Not On Any Menu");

  const [lenoir, chase, ramsHead] = (await getToday({ now: SAT_LUNCHTIME, preferences: prefs })).halls;
  const ramsHeadDinner = (await getToday({ now: SAT_LUNCHTIME, mealPeriod: "Dinner", preferences: prefs })).halls[2];

  expect(lenoir.favoriteCount).toBe(2); // Waffle, Grilled Chicken Breast
  expect(chase.favoriteCount).toBe(2); // Cheese Pizza, Grilled Chicken Breast
  expect(ramsHead.favoriteCount).toBe(1); // two Waffle recipes are one dish
  expect(ramsHeadDinner.favoriteCount).toBe(1); // Cheese Pizza
});

test("a favorite hidden by a diet filter isn't shown or counted", async () => {
  await seedBothHalls();

  const [lenoir] = (
    await getToday({
      now: SAT_LUNCHTIME,
      preferences: { ...favorites("Waffle", "Black Bean Burger Patty"), dietFilters: ["vegan"] },
    })
  ).halls;

  expect(layout(lenoir)).toEqual([["The Grill", ["Black Bean Burger Patty"]]]);
  expect(lenoir.favoriteCount).toBe(1);
});

test("a hall with no menu counts no favorites", async () => {
  await seedMenuDay({ location: LENOIR, date: "2026-11-07", mealPeriods: [] });

  const [lenoir] = (await getToday({ now: SAT_LUNCHTIME, preferences: favorites("Waffle") })).halls;

  expect(lenoir.favoriteCount).toBe(0);
});
