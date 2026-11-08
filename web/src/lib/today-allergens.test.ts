// Seam 3: allergen filters in the Today data layer.
import { afterAll, beforeEach, expect, test } from "vitest";
import { resetDb, seedMenuDay } from "../../test/seed";
import { closeDb } from "./db";
import { DEFAULT_PREFERENCES } from "./preferences";
import { getToday } from "./today";

const LENOIR = { slug: "top-of-lenoir", name: "Top of Lenoir" };
const SAT_LUNCHTIME = new Date("2026-11-07T17:30:00Z");

beforeEach(resetDb);
afterAll(closeDb);

// Allergens as in the Lenoir fixture's `allergen-has_*` classes.
async function seedBrunch() {
  await seedMenuDay({
    location: LENOIR,
    date: "2026-11-07",
    mealPeriods: [
      {
        name: "Brunch",
        stations: [
          {
            name: "The Grill",
            items: [
              { name: "Nashville Hot Chicken Biscuit", recipeId: 15469, allergens: ["wheat", "milk", "gluten"] },
              { name: "Black Bean Burger Patty", recipeId: 5810, allergens: [] },
            ],
          },
          {
            name: "Salad Bar",
            items: [{ name: "Creamy Caesar Dressing", recipeId: 7499, allergens: ["milk", "fish"] }],
          },
          {
            name: "Waffle Bar",
            items: [
              { name: "Waffle", recipeId: 8260, allergens: ["wheat", "milk", "gluten"] },
              { name: "Whipped Topping", recipeId: 14854, allergens: ["soy"] },
            ],
          },
        ],
      },
    ],
  });
}

const stationItems = (today: Awaited<ReturnType<typeof getToday>>) =>
  today.halls[0].mealPeriods[0].stations.map((s) => [s.name, s.items.map((i) => i.name)]);

test("with no allergens chosen every item is shown", async () => {
  await seedBrunch();

  const today = await getToday({ now: SAT_LUNCHTIME, preferences: DEFAULT_PREFERENCES });

  expect(stationItems(today)).toEqual([
    ["The Grill", ["Nashville Hot Chicken Biscuit", "Black Bean Burger Patty"]],
    ["Salad Bar", ["Creamy Caesar Dressing"]],
    ["Waffle Bar", ["Waffle", "Whipped Topping"]],
  ]);
});

test("choosing an allergen hides every item containing it, and stations left empty", async () => {
  await seedBrunch();

  const today = await getToday({ now: SAT_LUNCHTIME, preferences: { ...DEFAULT_PREFERENCES, allergens: ["milk"] } });

  expect(stationItems(today)).toEqual([
    ["The Grill", ["Black Bean Burger Patty"]],
    ["Waffle Bar", ["Whipped Topping"]],
  ]);
});

test("several allergens hide items containing any of them", async () => {
  await seedBrunch();

  const today = await getToday({
    now: SAT_LUNCHTIME,
    preferences: { ...DEFAULT_PREFERENCES, allergens: ["fish", "soy"] },
  });

  expect(stationItems(today)).toEqual([
    ["The Grill", ["Nashville Hot Chicken Biscuit", "Black Bean Burger Patty"]],
    ["Waffle Bar", ["Waffle"]],
  ]);
});

test("allergen and diet filters apply together", async () => {
  await seedMenuDay({
    location: LENOIR,
    date: "2026-11-07",
    mealPeriods: [
      {
        name: "Brunch",
        stations: [
          {
            name: "Waffle Bar",
            items: [
              { name: "Waffle", recipeId: 8260, dietaryTags: ["vegetarian"], allergens: ["wheat", "milk", "gluten"] },
              { name: "Whipped Topping", recipeId: 14854, dietaryTags: ["vegan", "vegetarian"], allergens: ["soy"] },
              { name: "Strawberries", recipeId: 1, dietaryTags: ["vegan", "vegetarian"], allergens: [] },
              { name: "Bacon", recipeId: 2, dietaryTags: [], allergens: [] },
            ],
          },
        ],
      },
    ],
  });

  const today = await getToday({
    now: SAT_LUNCHTIME,
    preferences: { ...DEFAULT_PREFERENCES, dietFilters: ["vegetarian"], allergens: ["soy"] },
  });

  expect(stationItems(today)).toEqual([["Waffle Bar", ["Waffle", "Strawberries"]]]);
});

test("a meal period where every item has a chosen allergen is still listed, with no stations", async () => {
  await seedMenuDay({
    location: LENOIR,
    date: "2026-11-07",
    mealPeriods: [
      {
        name: "Brunch",
        stations: [{ name: "Waffle Bar", items: [{ name: "Waffle", recipeId: 8260, allergens: ["wheat", "milk"] }] }],
      },
    ],
  });

  const today = await getToday({ now: SAT_LUNCHTIME, preferences: { ...DEFAULT_PREFERENCES, allergens: ["wheat"] } });

  expect(today.halls[0].mealPeriods).toEqual([{ name: "Brunch", start: null, end: null, favorites: [], stations: [] }]);
});
