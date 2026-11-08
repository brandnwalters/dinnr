// UI smoke tests: the allergen disclaimer shows whenever an allergen filter is on, and only then.
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { AllergenDisclaimer } from "./allergen-disclaimer";

test("the disclaimer is shown while any allergen is chosen", () => {
  const html = renderToStaticMarkup(<AllergenDisclaimer allergens={["peanut"]} />);

  expect(html).toContain("UNC");
  expect(html).toMatch(/cross-contact/i);
  expect(html).toMatch(/ask (the )?(dining )?staff/i);
});

test("the disclaimer is not shown when no allergen is chosen", () => {
  expect(renderToStaticMarkup(<AllergenDisclaimer allergens={[]} />)).toBe("");
});
