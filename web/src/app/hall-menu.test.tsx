// UI smoke tests: the menu list shows calories and protein (and copes without
// nutrition), dietary tag badges on menu items, and favorites at the top of the list.
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import type { MenuItem } from "@/lib/today";
import { HallMenu } from "./hall-menu";

const nutrition = (calories: number | null, proteinG: number | null) => ({
  servingSize: "4 oz",
  calories,
  proteinG,
  carbsG: 0,
  fatG: 4,
});

/** A menu item; `normalizedName` defaults from `name`, `favorite` to false, `allergens` to none. */
type GrillItem = Omit<MenuItem, "normalizedName" | "favorite" | "allergens"> &
  Partial<Pick<MenuItem, "normalizedName" | "favorite" | "allergens">>;

/** Lenoir serving Brunch, with these items at The Grill. */
const renderGrill = (grillItems: GrillItem[], favoriteCount = 0) => {
  const items = grillItems.map((i) => ({ normalizedName: i.name.toLowerCase(), favorite: false, allergens: [], ...i }));
  return renderToStaticMarkup(
    <HallMenu
      hall={{
        slug: "top-of-lenoir",
        name: "Top of Lenoir",
        status: "serving",
        currentMealPeriod: "Brunch",
        selectedMealPeriod: "Brunch",
        favoriteCount,
        mealPeriods: [
          {
            name: "Brunch",
            start: "11:00",
            end: "15:00",
            favorites: items.filter((i) => i.favorite).map((item) => ({ station: "The Grill", item })),
            stations: [{ name: "The Grill", items }],
          },
        ],
      }}
    />,
  );
};

test("each item shows its calories and protein; items without nutrition still render", () => {
  const html = renderGrill([
    { name: "Chicken Breast", recipeId: 13708, dietaryTags: [], nutrition: nutrition(140, 25) },
    { name: "Buttermilk Pancake", recipeId: 14169, dietaryTags: [], nutrition: nutrition(80, 2.5) },
    { name: "Mystery Special", recipeId: 99999, dietaryTags: [] },
    { name: "Half-labelled", recipeId: 8260, dietaryTags: [], nutrition: nutrition(200, null) },
  ]);

  expect(html).toContain("Chicken Breast");
  expect(html).toContain("140 cal");
  expect(html).toContain("25 g protein");
  expect(html).toContain("2.5 g protein");
  expect(html).toContain("Mystery Special");
  expect(html).toContain("200 cal");
  expect(html).not.toContain("null");
  expect(html).not.toContain("undefined");
});

test("items show their dietary tags as badges", () => {
  const html = renderGrill([
    { name: "Black Bean Burger Patty", recipeId: 5810, dietaryTags: ["vegan", "made_without_gluten"] },
    { name: "Nashville Hot Chicken Biscuit", recipeId: 15469, dietaryTags: [] },
  ]);

  const burger = html.slice(html.indexOf("Black Bean"), html.indexOf("Nashville"));
  expect(burger).toContain("Vegan");
  expect(burger).toContain("Made Without Gluten");
  expect(html.slice(html.indexOf("Nashville"))).not.toContain("Vegan");
});

test("favorites are highlighted, each item has a star toggle, and the hall shows its favorite count", () => {
  const html = renderGrill(
    [
      { name: "Grilled Chicken Breast", recipeId: 13708, dietaryTags: [], favorite: true },
      { name: "Nashville Hot Chicken Biscuit", recipeId: 15469, dietaryTags: [] },
    ],
    1,
  );

  expect(html).toContain("1 favorite this meal");
  const chicken = html.slice(html.indexOf('data-recipe="13708"'), html.indexOf('data-recipe="15469"'));
  expect(chicken).toContain('data-favorite="true"');
  expect(chicken).toContain('aria-pressed="true"');
  expect(chicken).toContain("Unstar Grilled Chicken Breast");
  const biscuit = html.slice(html.indexOf('data-recipe="15469"'));
  expect(biscuit).not.toContain("data-favorite");
  expect(biscuit).toContain("Star Nashville Hot Chicken Biscuit");
});

test("favorites are listed at the top of the hall's list with their station, above the stations", () => {
  const html = renderGrill([
    { name: "Nashville Hot Chicken Biscuit", recipeId: 15469, dietaryTags: [] },
    { name: "Grilled Chicken Breast", recipeId: 13708, dietaryTags: [], favorite: true },
  ]);

  const top = html.slice(html.indexOf("Your favorites"), html.indexOf(">The Grill</h4>"));
  expect(top).toContain("Grilled Chicken Breast");
  expect(top).toContain("The Grill");
  expect(top).not.toContain("Nashville");
  // Still in its station below too.
  expect(html.slice(html.indexOf(">The Grill</h4>"))).toContain("Grilled Chicken Breast");
});

test("with no favorites there's no favorites group", () => {
  const html = renderGrill([{ name: "Nashville Hot Chicken Biscuit", recipeId: 15469, dietaryTags: [] }]);

  expect(html).not.toContain("Your favorites");
});
