// UI smoke test: dietary tag badges on menu items.
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { HallMenu } from "./hall-menu";

test("items show their dietary tags as badges", () => {
  const html = renderToStaticMarkup(
    <HallMenu
      hall={{
        slug: "top-of-lenoir",
        name: "Top of Lenoir",
        mealPeriods: [
          {
            name: "Brunch",
            stations: [
              {
                name: "The Grill",
                items: [
                  { name: "Black Bean Burger Patty", recipeId: 5810, dietaryTags: ["vegan", "made_without_gluten"] },
                  { name: "Nashville Hot Chicken Biscuit", recipeId: 15469, dietaryTags: [] },
                ],
              },
            ],
          },
        ],
      }}
    />,
  );

  const burger = html.slice(html.indexOf("Black Bean"), html.indexOf("Nashville"));
  expect(burger).toContain("Vegan");
  expect(burger).toContain("Made Without Gluten");
  expect(html.slice(html.indexOf("Nashville"))).not.toContain("Vegan");
});
