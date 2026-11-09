// UI smoke test: each dish name opens its nutrition sheet.
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { HallMenu } from "./hall-menu";

test("each menu item is a button that opens its nutrition and ingredients", () => {
  const html = renderToStaticMarkup(
    <HallMenu
      hall={{
        slug: "top-of-lenoir",
        name: "Top of Lenoir",
        status: "serving",
        currentMealPeriod: "Brunch",
        selectedMealPeriod: "Brunch",
        favoriteCount: 0,
        mealPeriods: [
          {
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
          },
        ],
      }}
    />,
  );

  expect(html).toMatch(/<button[^>]*aria-haspopup="dialog"[^>]*>Chicken Breast<\/button>/);
});
