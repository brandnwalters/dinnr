// Seam 3: recipe nutrition joined onto today's menu items.
import { afterAll, beforeEach, expect, test } from "vitest";
import { resetDb, seedMenuDay, seedNutrition } from "../../test/seed";
import { closeDb } from "./db";
import { getToday } from "./today";

const LENOIR = { slug: "top-of-lenoir", name: "Top of Lenoir" };
const SAT_LUNCHTIME = new Date("2026-11-07T17:30:00Z");

beforeEach(resetDb);
afterAll(closeDb);

async function seedGrill(items: { name: string; recipeId: number }[]) {
  await seedMenuDay({
    location: LENOIR,
    date: "2026-11-07",
    mealPeriods: [{ name: "Brunch", stations: [{ name: "The Grill", items }] }],
  });
}

async function grillItems() {
  const today = await getToday({ now: SAT_LUNCHTIME });
  return today.halls[0].mealPeriods[0].stations[0].items;
}

test("each item carries its recipe's serving size, calories, protein, carbs and fat", async () => {
  await seedGrill([
    { name: "Chicken Breast", recipeId: 13708 },
    { name: "Buttermilk Pancake", recipeId: 14169 },
  ]);
  // Values from fixtures/unc/recipes/recipe-13708.json and recipe-14169.json.
  await seedNutrition({ recipeId: 13708, servingSize: "4 oz", calories: 140, proteinG: 25, carbsG: 0, fatG: 4 });
  await seedNutrition({ recipeId: 14169, servingSize: "1 pancakes", calories: 80, proteinG: 2, carbsG: 16, fatG: 0.5 });

  expect(await grillItems()).toEqual([
    {
      name: "Chicken Breast",
      recipeId: 13708,
      nutrition: { servingSize: "4 oz", calories: 140, proteinG: 25, carbsG: 0, fatG: 4 },
    },
    {
      name: "Buttermilk Pancake",
      recipeId: 14169,
      nutrition: { servingSize: "1 pancakes", calories: 80, proteinG: 2, carbsG: 16, fatG: 0.5 },
    },
  ]);
});

test("an item whose nutrition hasn't been fetched has no nutrition", async () => {
  await seedGrill([{ name: "Mystery Special", recipeId: 99999 }]);

  const [item] = await grillItems();

  expect(item).toEqual({ name: "Mystery Special", recipeId: 99999 });
  expect(item.nutrition).toBeUndefined();
});

test("amounts left blank on the label come back as null", async () => {
  await seedGrill([{ name: "Waffle", recipeId: 8260 }]);
  await seedNutrition({ recipeId: 8260, servingSize: null, calories: 200, proteinG: null, carbsG: null, fatG: null });

  const [item] = await grillItems();

  expect(item.nutrition).toEqual({ servingSize: null, calories: 200, proteinG: null, carbsG: null, fatG: null });
});
