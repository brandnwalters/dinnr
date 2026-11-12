// Seam 3: dietary tags and diet filters in the Today data layer.
import { afterAll, beforeEach, expect, test } from "vitest";
import { resetDb, seedMenuDay } from "../../test/seed";
import { closeDb } from "./db";
import { DEFAULT_PREFERENCES } from "./preferences";
import { getToday } from "./today";

const LENOIR = { slug: "top-of-lenoir", name: "Top of Lenoir" };
const SAT_LUNCHTIME = new Date("2026-11-07T17:30:00Z");

beforeEach(resetDb);
afterAll(closeDb);

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
              { name: "Nashville Hot Chicken Biscuit", recipeId: 15469, dietaryTags: [] },
              { name: "Black Bean Burger Patty", recipeId: 5810, dietaryTags: ["vegan", "vegetarian", "halal"] },
            ],
          },
          {
            name: "Waffle Bar",
            items: [{ name: "Waffle", recipeId: 8260, dietaryTags: ["vegetarian", "halal"] }],
          },
          {
            name: "Beverages",
            items: [{ name: "Whole Milk", recipeId: 6650, dietaryTags: ["vegetarian", "made_without_gluten"] }],
          },
        ],
      },
    ],
  });
}

const itemNames = (today: Awaited<ReturnType<typeof getToday>>) =>
  today.halls[0].mealPeriods[0].stations.flatMap((s) => s.items.map((i) => i.name));

test("items carry their dietary tags", async () => {
  await seedBrunch();

  const today = await getToday({ now: SAT_LUNCHTIME });

  const grill = today.halls[0].mealPeriods[0].stations[0];
  expect(grill.items).toMatchObject([
    { name: "Nashville Hot Chicken Biscuit", recipeId: 15469, dietaryTags: [] },
    { name: "Black Bean Burger Patty", recipeId: 5810, dietaryTags: ["vegan", "vegetarian", "halal"] },
  ]);
});

test("with no diet filters every item is shown", async () => {
  await seedBrunch();

  const today = await getToday({ now: SAT_LUNCHTIME, preferences: DEFAULT_PREFERENCES });

  expect(itemNames(today)).toEqual(["Nashville Hot Chicken Biscuit", "Black Bean Burger Patty", "Waffle", "Whole Milk"]);
});

test("a diet filter hides every item without that tag, and stations left empty", async () => {
  await seedBrunch();

  const today = await getToday({
    now: SAT_LUNCHTIME,
    preferences: { ...DEFAULT_PREFERENCES, dietFilters: ["vegan"] },
  });

  expect(today.halls[0].mealPeriods[0].stations).toMatchObject([
    {
      name: "The Grill",
      items: [{ name: "Black Bean Burger Patty", recipeId: 5810, dietaryTags: ["vegan", "vegetarian", "halal"] }],
    },
  ]);
});

test("several diet filters are all required (strict cutoffs, not 'any of')", async () => {
  await seedBrunch();

  const today = await getToday({
    now: SAT_LUNCHTIME,
    preferences: { ...DEFAULT_PREFERENCES, dietFilters: ["vegetarian", "halal"] },
  });

  expect(itemNames(today)).toEqual(["Black Bean Burger Patty", "Waffle"]);
});

test("a meal period with nothing matching the filters is still listed, with no stations", async () => {
  await seedBrunch();

  const today = await getToday({
    now: SAT_LUNCHTIME,
    preferences: { ...DEFAULT_PREFERENCES, dietFilters: ["organic"] },
  });

  expect(today.halls[0].mealPeriods).toEqual([
    {
      name: "Brunch",
      start: null,
      end: null,
      favorites: [],
      stations: [],
      hiddenByFilters: ["Nashville Hot Chicken Biscuit", "Black Bean Burger Patty", "Waffle", "Whole Milk"],
    },
  ]);
});
