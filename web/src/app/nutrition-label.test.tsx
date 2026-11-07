// UI smoke tests: the nutrition detail panel's contents.
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import type { NutritionDetail } from "@/lib/nutrition-detail";
import { NutritionLabel } from "./nutrition-label";

// fixtures/unc/recipes/recipe-13708.json
const CHICKEN: NutritionDetail = {
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
    { name: "Vitamin D", amount: 0, unit: "mcg" },
  ],
  ingredients: "CHICKEN BREAST BNLS SKNLS 4 OZ FZ",
};

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

test("shows every line of the label and the ingredients", () => {
  const shown = text(renderToStaticMarkup(<NutritionLabel detail={CHICKEN} />));

  expect(shown).toContain("Serving size 4 oz");
  expect(shown).toContain("Calories 140");
  expect(shown).toContain("Total fat 4 g");
  expect(shown).toContain("Saturated fat 1.5 g");
  expect(shown).toContain("Trans fat 0 g");
  expect(shown).toContain("Cholesterol 65 mg");
  expect(shown).toContain("Sodium 40 mg");
  expect(shown).toContain("Total carbohydrate 0 g");
  expect(shown).toContain("Dietary fiber 0 g");
  expect(shown).toContain("Sugars 0 g");
  expect(shown).toContain("Added sugar 0 g");
  expect(shown).toContain("Protein 25 g");
  expect(shown).toContain("Iron 1 mg");
  expect(shown).toContain("Vitamin D 0 mcg");
  expect(shown).toContain("CHICKEN BREAST BNLS SKNLS 4 OZ FZ");
});

test("blank amounts show as a dash, not 'null'", () => {
  const shown = text(
    renderToStaticMarkup(<NutritionLabel detail={{ ...CHICKEN, sodiumMg: null, ingredients: null }} />),
  );

  expect(shown).toContain("Sodium –");
  expect(shown).not.toContain("null");
});

test("an item without nutrition says nutrition is unavailable", () => {
  const shown = text(renderToStaticMarkup(<NutritionLabel detail={null} />));

  expect(shown).toMatch(/nutrition unavailable/i);
});
