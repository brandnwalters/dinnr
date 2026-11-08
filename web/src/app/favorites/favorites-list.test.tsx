// UI smoke test: the manage page lists favorites, each with a remove button.
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { FavoritesList } from "./favorites-list";

test("lists each favorite by name with a remove button", () => {
  const html = renderToStaticMarkup(
    <FavoritesList
      favorites={[
        { normalizedName: "grilled chicken breast", name: "Grilled Chicken Breast" },
        { normalizedName: "waffle", name: "Waffle" },
      ]}
    />,
  );

  expect(html).toContain("Grilled Chicken Breast");
  expect(html).toContain("Remove Grilled Chicken Breast");
  expect(html).toContain("Remove Waffle");
});

test("with no favorites, says how to add one", () => {
  expect(renderToStaticMarkup(<FavoritesList favorites={[]} />)).toContain("No favorites yet");
});
