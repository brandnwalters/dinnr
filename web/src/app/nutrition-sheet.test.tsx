// UI smoke test: each dish name opens its nutrition sheet.
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { MealPeriodMenu } from "./hall-menu";

test("each menu item is a button that opens its nutrition and ingredients", () => {
  const html = renderToStaticMarkup(
    <MealPeriodMenu
      mealPeriod={{
        name: "Brunch",
        start: "11:00",
        end: "15:00",
        favorites: [],
        stations: [
          {
            name: "The Grill",
            items: [
              {
                name: "Chicken Breast",
                recipeId: 13708,
                normalizedName: "chicken breast",
                favorite: false,
                dietaryTags: [],
                allergens: [],
              },
            ],
          },
        ],
      }}
    />,
  );

  expect(html).toMatch(/<button[^>]*aria-haspopup="dialog"[^>]*>Chicken Breast<\/button>/);
});
