// UI smoke tests: the filter sheet's contents (diet and allergen chips, the disclaimer) and the header's filter button.
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { FilterButton, FilterOptions } from "./filter-options";

/** The opening tag of the button whose text is `label`. */
function chipTag(html: string, label: string): string {
  const end = html.indexOf(`>${label}</button>`);
  return html.slice(0, end).match(/<button\b[^>]*$/)?.[0] ?? "";
}

test("has a chip for every diet tag and allergen, none pressed by default", () => {
  const html = renderToStaticMarkup(<FilterOptions dietFilters={[]} allergens={[]} />);

  for (const label of ["Vegan", "Vegetarian", "Halal", "Made Without Gluten", "Coolfood"]) {
    expect(chipTag(html, label)).toContain('aria-pressed="false"');
  }
  for (const label of ["Egg", "Soy", "Peanut", "Tree Nuts", "Gluten"]) {
    expect(chipTag(html, label)).toContain('aria-pressed="false"');
  }
});

test("chips for the active filters are pressed, and only those", () => {
  const html = renderToStaticMarkup(<FilterOptions dietFilters={["vegan"]} allergens={["peanut", "milk"]} />);

  expect(chipTag(html, "Vegan")).toContain('aria-pressed="true"');
  expect(chipTag(html, "Peanut")).toContain('aria-pressed="true"');
  expect(chipTag(html, "Milk")).toContain('aria-pressed="true"');
  expect(chipTag(html, "Vegetarian")).toContain('aria-pressed="false"');
  expect(html.match(/aria-pressed="true"/g)).toHaveLength(3);
});

test("labels the two groups", () => {
  const html = renderToStaticMarkup(<FilterOptions dietFilters={[]} allergens={[]} />);
  expect(html).toContain("Only show items that are");
  expect(html).toContain("Hide items containing");
});

test("has a legend explaining every diet tag abbreviation used on the menus", () => {
  const html = renderToStaticMarkup(<FilterOptions dietFilters={[]} allergens={[]} />);
  const legend = html.slice(html.indexOf("Menu abbreviations"));

  for (const [abbreviation, label] of [
    ["VG", "Vegan"],
    ["V", "Vegetarian"],
    ["H", "Halal"],
    ["GF", "Made Without Gluten"],
    ["SC", "Smart Choice"],
    ["L", "Local"],
    ["O", "Organic"],
    ["SS", "Sustainable Seafood"],
    ["CF", "Coolfood"],
  ]) {
    expect(legend).toMatch(new RegExp(`<dt[^>]*>${abbreviation}</dt><dd[^>]*>${label}</dd>`));
  }
});

test("shows the allergen disclaimer while an allergen filter is on", () => {
  const html = renderToStaticMarkup(<FilterOptions dietFilters={[]} allergens={["sesame"]} />);
  expect(html).toContain('role="note"');
  expect(html).toMatch(/cross-contact/i);
});

test("the filter button is labelled and badges the number of active diet and allergen filters", () => {
  const html = renderToStaticMarkup(<FilterButton dietFilters={["vegan"]} allergens={["peanut", "milk"]} />);
  expect(html).toMatch(/<button[^>]*aria-label="Filters, 3 active"/);
  expect(html).toContain(">3<");
});

test("no badge when no filter is on", () => {
  const html = renderToStaticMarkup(<FilterButton dietFilters={[]} allergens={[]} />);
  expect(html).toMatch(/<button[^>]*aria-label="Filters"/);
  expect(html).not.toMatch(/>\d+</);
});

test("no disclaimer with only diet filters on", () => {
  const html = renderToStaticMarkup(<FilterOptions dietFilters={["vegan"]} allergens={[]} />);
  expect(html).not.toContain('role="note"');
  expect(html).not.toMatch(/cross-contact/i);
});
