// UI smoke tests: the Me screen lists favorites (each with unstar) and the About notes.
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { MeScreen } from "./me-screen";

const favorites = [
  { normalizedName: "grilled chicken breast", name: "Grilled Chicken Breast" },
  { normalizedName: "waffle", name: "Waffle" },
];

test("lists each favorite by name with an unstar button", () => {
  const html = renderToStaticMarkup(<MeScreen favorites={favorites} />);

  expect(html).toContain("My favorites");
  expect(html).toContain("Grilled Chicken Breast");
  expect(html).toContain('aria-label="Unstar Grilled Chicken Breast"');
  expect(html).toContain('aria-label="Unstar Waffle"');
});

test("with no favorites, says how to add one", () => {
  const html = renderToStaticMarkup(<MeScreen favorites={[]} />);
  expect(html).toContain("No favorites yet");
  expect(html).not.toContain("Unstar");
});

test("About explains the data source, cross-contact and on-device storage", () => {
  const html = renderToStaticMarkup(<MeScreen favorites={[]} />);

  expect(html).toContain("About");
  expect(html).toContain("UNC Dining");
  expect(html).toMatch(/allergen filters rely on UNC Dining&#x27;s labels/i);
  expect(html).toContain("cross-contact");
  expect(html).toContain("saved on this device only");
});
