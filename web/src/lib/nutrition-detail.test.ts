// Seam 3 (nutrition detail): an item's full nutrition label and ingredients, by recipe id.
import { afterAll, beforeEach, expect, test } from "vitest";
import { resetDb, seedNutrition } from "../../test/seed";
import { closeDb } from "./db";
import { getNutritionDetail } from "./nutrition-detail";

beforeEach(resetDb);
afterAll(closeDb);

test("returns the full label and ingredient list for a recipe", async () => {
  // Values from fixtures/unc/recipes/recipe-13708.json (see scraper test_scrape_nutrition.py).
  await seedNutrition({
    recipeId: 13708,
    name: "Chicken Breast",
    servingSize: "4 oz",
    calories: 140,
    fatG: 4,
    saturatedFatG: 1.5,
    transFatG: 0,
    cholesterolMg: 65,
    sodiumMg: 40,
    carbsG: 0,
    fiberG: 0,
    sugarsG: 0,
    addedSugarG: 0,
    proteinG: 25,
    micronutrients: [
      { name: "Calcium", amount: 0, unit: "mg" },
      { name: "Iron", amount: 1, unit: "mg" },
      { name: "Potassium", amount: 0, unit: "mg" },
      { name: "Vitamin D", amount: 0, unit: "mcg" },
    ],
    ingredients: "CHICKEN BREAST BNLS SKNLS 4 OZ FZ (Boneless, skinless chicken breast filets with rib meat)",
  });

  expect(await getNutritionDetail(13708)).toEqual({
    recipeId: 13708,
    name: "Chicken Breast",
    servingSize: "4 oz",
    calories: 140,
    totalFatG: 4,
    saturatedFatG: 1.5,
    transFatG: 0,
    cholesterolMg: 65,
    sodiumMg: 40,
    totalCarbohydrateG: 0,
    dietaryFiberG: 0,
    sugarsG: 0,
    addedSugarG: 0,
    proteinG: 25,
    micronutrients: [
      { name: "Calcium", amount: 0, unit: "mg" },
      { name: "Iron", amount: 1, unit: "mg" },
      { name: "Potassium", amount: 0, unit: "mg" },
      { name: "Vitamin D", amount: 0, unit: "mcg" },
    ],
    ingredients: "CHICKEN BREAST BNLS SKNLS 4 OZ FZ (Boneless, skinless chicken breast filets with rib meat)",
  });
});

test("a recipe whose nutrition was never fetched has no detail", async () => {
  expect(await getNutritionDetail(99999)).toBeNull();
});

test("amounts left blank on the label come back as null", async () => {
  await seedNutrition({ recipeId: 8260, calories: 200 });

  expect(await getNutritionDetail(8260)).toMatchObject({
    calories: 200,
    servingSize: null,
    sodiumMg: null,
    addedSugarG: null,
    micronutrients: [],
    ingredients: null,
  });
});
