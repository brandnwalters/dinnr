// UI smoke test: the menu list shows calories and protein, and copes without nutrition.
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { HallMenu } from "./hall-menu";

const nutrition = (calories: number | null, proteinG: number | null) => ({
  servingSize: "4 oz",
  calories,
  proteinG,
  carbsG: 0,
  fatG: 4,
});

test("each item shows its calories and protein; items without nutrition still render", () => {
  const html = renderToStaticMarkup(
    <HallMenu
      hall={{
        slug: "top-of-lenoir",
        name: "Top of Lenoir",
        status: "serving",
        currentMealPeriod: "Brunch",
        selectedMealPeriod: "Brunch",
        mealPeriods: [
          {
            name: "Brunch",
            start: "11:00",
            end: "15:00",
            stations: [
              {
                name: "The Grill",
                items: [
                  { name: "Chicken Breast", recipeId: 13708, nutrition: nutrition(140, 25) },
                  { name: "Buttermilk Pancake", recipeId: 14169, nutrition: nutrition(80, 2.5) },
                  { name: "Mystery Special", recipeId: 99999 },
                  { name: "Half-labelled", recipeId: 8260, nutrition: nutrition(200, null) },
                ],
              },
            ],
          },
        ],
      }}
    />,
  );

  expect(html).toContain("Chicken Breast");
  expect(html).toContain("140 cal");
  expect(html).toContain("25 g protein");
  expect(html).toContain("2.5 g protein");
  expect(html).toContain("Mystery Special");
  expect(html).toContain("200 cal");
  expect(html).not.toContain("null");
  expect(html).not.toContain("undefined");
});
