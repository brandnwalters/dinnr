// UI smoke tests: the menu list shows calories and protein (and copes without
// nutrition), and dietary tag badges on menu items.
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

/** A menu item; `normalizedName` defaults from `name`, `favorite` to false. */
type GrillItem = Omit<MenuItem, "normalizedName" | "favorite"> & Partial<Pick<MenuItem, "normalizedName" | "favorite">>;

/** Lenoir serving Brunch, with these items at The Grill. */
const renderGrill = (grillItems: GrillItem[], favoriteCount = 0) => {
  const items = grillItems.map((i) => ({ normalizedName: i.name.toLowerCase(), favorite: false, ...i }));
  return renderToStaticMarkup(
    <HallMenu
      hall={{
        slug: "top-of-lenoir",
        name: "Top of Lenoir",
        status: "serving",
        currentMealPeriod: "Brunch",
        selectedMealPeriod: "Brunch",
        favoriteCount,
        mealPeriods: [{ name: "Brunch", start: "11:00", end: "15:00", stations: [{ name: "The Grill", items }] }],
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
