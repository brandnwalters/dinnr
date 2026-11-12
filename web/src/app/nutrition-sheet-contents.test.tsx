// UI smoke tests: what the nutrition sheet shows for a dish (full diet-tag
// names, the favorite star, and the loading / error / loaded states).
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import type { MenuItem } from "@/lib/today";
import { NutritionSheetContents } from "./nutrition-sheet-contents";

const ITEM: MenuItem = {
  name: "Black Bean Burger",
  recipeId: 8260,
  normalizedName: "black bean burger",
  favorite: false,
  dietaryTags: ["vegan", "made_without_gluten", "cool_foods"],
  allergens: [],
};

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

test("names every diet tag in full", () => {
  const shown = text(renderToStaticMarkup(<NutritionSheetContents item={ITEM} nutrition={{ state: "loading" }} />));

  expect(shown).toContain("Vegan");
  expect(shown).toContain("Made Without Gluten");
  expect(shown).toContain("Coolfood");
});

test("has a star that shows whether the dish is a favorite", () => {
  const unstarred = renderToStaticMarkup(<NutritionSheetContents item={ITEM} nutrition={{ state: "loading" }} />);
  const starred = renderToStaticMarkup(
    <NutritionSheetContents item={{ ...ITEM, favorite: true }} nutrition={{ state: "loading" }} />,
  );

  expect(unstarred).toMatch(/<button[^>]*aria-pressed="false"[^>]*aria-label="Star Black Bean Burger"/);
  expect(starred).toMatch(/<button[^>]*aria-pressed="true"[^>]*aria-label="Unstar Black Bean Burger"/);
});

test("says when nutrition is loading or couldn't be loaded", () => {
  const loading = text(renderToStaticMarkup(<NutritionSheetContents item={ITEM} nutrition={{ state: "loading" }} />));
  const failed = text(renderToStaticMarkup(<NutritionSheetContents item={ITEM} nutrition={{ state: "error" }} />));

  expect(loading).toMatch(/loading nutrition/i);
  expect(failed).toMatch(/couldn&#x27;t load nutrition/i);
  expect(failed).not.toMatch(/loading nutrition/i);
});

const WITH_MACROS: MenuItem = {
  ...ITEM,
  nutrition: { servingSize: "1 each", calories: 210, proteinG: 11, carbsG: 30, fatG: 6 },
};

/** The opening tag of the button whose text is `label`. */
const buttonTag = (html: string, label: string) =>
  html.slice(0, html.indexOf(`>${label}</button>`) + 1).match(/<button\b[^>]*>/g)?.at(-1) ?? "";

test("'I ate this' logs the dish, with a servings stepper in ½ steps starting at 1", () => {
  const html = renderToStaticMarkup(
    <NutritionSheetContents item={WITH_MACROS} nutrition={{ state: "loading" }} onLog={() => {}} />,
  );

  expect(buttonTag(html, "I ate this")).not.toMatch(/ disabled=""/);
  expect(html).toMatch(/aria-label="Fewer servings"/);
  expect(html).toMatch(/aria-label="More servings"/);
  expect(text(html)).toContain("1 serving");
});

test("'I ate this' is disabled, with the reason, for a dish without nutrition data", () => {
  const html = renderToStaticMarkup(<NutritionSheetContents item={ITEM} nutrition={{ state: "loading" }} onLog={() => {}} />);

  expect(buttonTag(html, "I ate this")).toMatch(/ disabled=""/);
  expect(text(html)).toMatch(/No nutrition data for this dish/);
});

test("once loaded, shows the nutrition label and ingredients", () => {
  const shown = text(
    renderToStaticMarkup(
      <NutritionSheetContents
        item={ITEM}
        nutrition={{
          state: "loaded",
          detail: {
            recipeId: 8260,
            name: "Black Bean Burger",
            servingSize: "1 each",
            calories: 210,
            totalFatG: 6,
            saturatedFatG: 1,
            transFatG: 0,
            cholesterolMg: 0,
            sodiumMg: 480,
            totalCarbohydrateG: 30,
            dietaryFiberG: 8,
            sugarsG: 2,
            addedSugarG: 0,
            proteinG: 11,
            micronutrients: [],
            ingredients: "BLACK BEANS, BROWN RICE, ONION",
          },
        }}
      />,
    ),
  );

  expect(shown).toContain("Serving size 1 each");
  expect(shown).toContain("Calories 210");
  expect(shown).toContain("Protein 11 g");
  expect(shown).toContain("BLACK BEANS, BROWN RICE, ONION");
  expect(shown).not.toMatch(/loading nutrition/i);
});

test("says when and where the dish was last served, and nothing when there's no earlier record", () => {
  const served = text(
    renderToStaticMarkup(
      <NutritionSheetContents
        item={{
          ...ITEM,
          lastServed: { date: "2026-11-03", mealPeriod: "Dinner", hallSlug: "chase", hallName: "Chase" },
        }}
        nutrition={{ state: "loading" }}
      />,
    ),
  );
  const never = text(renderToStaticMarkup(<NutritionSheetContents item={ITEM} nutrition={{ state: "loading" }} />));

  expect(served).toContain("Last served at Chase, Tue Nov 3, Dinner");
  expect(never).not.toMatch(/last served/i);
});
