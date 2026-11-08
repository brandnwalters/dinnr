// Seam 3: the scraper's station flag (condiments, beverages, ...) reaches the combo engine's input.
import { afterAll, beforeEach, expect, test } from "vitest";
import { resetDb, seedMenuDay, seedNutrition } from "../../test/seed";
import { comboItemsFrom } from "./combos";
import { closeDb } from "./db";
import { getToday } from "./today";

const LENOIR = { slug: "top-of-lenoir", name: "Top of Lenoir" };
const SAT_LUNCHTIME = new Date("2026-11-07T17:30:00Z");

beforeEach(resetDb);
afterAll(closeDb);

test("items only served at stations flagged as excluded from combos are marked excluded", async () => {
  await seedMenuDay({
    location: LENOIR,
    date: "2026-11-07",
    mealPeriods: [
      {
        name: "Brunch",
        stations: [
          {
            name: "Condiments and Spreads",
            excludedFromCombos: true,
            items: [
              { name: "Peanut Butter", recipeId: 1 },
              { name: "Honey", recipeId: 2 },
            ],
          },
          {
            name: "Waffle Bar",
            items: [
              { name: "Waffle", recipeId: 3 },
              // Also at the flagged station: still usable, since you can get it here.
              { name: "Honey", recipeId: 2 },
            ],
          },
        ],
      },
    ],
  });
  for (const recipeId of [1, 2, 3]) {
    await seedNutrition({ recipeId, servingSize: "1 each", calories: 100, proteinG: 5, carbsG: 10, fatG: 3 });
  }

  const today = await getToday({ now: SAT_LUNCHTIME });
  const items = comboItemsFrom(today.halls[0].mealPeriods[0]);

  expect(items.map((it) => [it.name, it.excluded ?? false])).toEqual([
    ["Peanut Butter", true],
    ["Honey", false],
    ["Waffle", false],
  ]);
  expect(today.halls[0].mealPeriods[0].stations.map((s) => [s.name, s.excludedFromCombos ?? false])).toEqual([
    ["Condiments and Spreads", true],
    ["Waffle Bar", false],
  ]);
});
