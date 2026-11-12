// UI smoke tests: the header's search button and the search sheet's contents.
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import type { MenuItem, TodayMenu } from "@/lib/today";
import { SearchPanel, SearchSheet } from "./search-sheet";

const item = (name: string, recipeId: number): MenuItem => ({
  name,
  recipeId,
  normalizedName: name.toLowerCase(),
  favorite: false,
  dietaryTags: [],
  allergens: [],
});

const today: TodayMenu = {
  date: "2026-11-11",
  halls: [
    {
      slug: "chase",
      name: "Chase",
      status: "serving",
      currentMealPeriod: "Lunch",
      selectedMealPeriod: "Lunch",
      favoriteCount: 0,
      mealPeriods: [
        {
          name: "Lunch",
          start: "11:00",
          end: "14:00",
          favorites: [],
          stations: [{ name: "Sushi", items: [item("California Sushi Roll", 1), item("Edamame", 2)] }],
          hiddenByFilters: ["Shrimp Sushi Roll"],
        },
      ],
    },
    {
      slug: "top-of-lenoir",
      name: "Top of Lenoir",
      status: "serving",
      currentMealPeriod: "Dinner",
      selectedMealPeriod: "Dinner",
      favoriteCount: 0,
      mealPeriods: [
        {
          name: "Dinner",
          start: "17:00",
          end: "20:00",
          favorites: [],
          stations: [{ name: "Asian Fusion", items: [item("Sushi Bowl", 3)] }],
        },
      ],
    },
  ],
};

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

test("the header's search button opens the search dialog", () => {
  const html = renderToStaticMarkup(<SearchSheet />);

  expect(html).toMatch(/<button(?=[^>]*aria-label="Search dishes")(?=[^>]*aria-haspopup="dialog")[^>]*>/);
});

test("the sheet has a search box", () => {
  const html = renderToStaticMarkup(<SearchPanel query="" onQueryChange={() => {}} menu={today} />);

  expect(html).toMatch(/<input[^>]*type="search"[^>]*aria-label="Search today&#x27;s dishes"/);
});

test("an empty query shows a hint", () => {
  const html = renderToStaticMarkup(<SearchPanel query="" onQueryChange={() => {}} menu={today} />);

  expect(text(html)).toContain("Type part of a dish name to search both halls");
});

test("results are grouped by hall then meal period, show their station, and open their nutrition", () => {
  const html = renderToStaticMarkup(<SearchPanel query="SUSHI" onQueryChange={() => {}} menu={today} />);

  const shown = text(html);
  expect(shown).toMatch(
    /Chase .*Lunch .*California Sushi Roll .*Sushi .*Top of Lenoir .*Dinner .*Sushi Bowl .*Asian Fusion/,
  );
  expect(shown).not.toContain("Edamame");
  expect(shown).not.toContain("Shrimp Sushi Roll");
  expect(html).toMatch(/<button[^>]*aria-haspopup="dialog"[^>]*>California Sushi Roll<\/button>/);
  expect(shown).toContain("1 hidden by your filters");
  // The count is announced as it changes.
  expect(html).toMatch(/<p[^>]*aria-live="polite"[^>]*>2 dishes found<\/p>/);
});

test("a query with no matches shows a friendly empty state", () => {
  const html = renderToStaticMarkup(<SearchPanel query="pho" onQueryChange={() => {}} menu={today} />);

  expect(text(html)).toContain("No dishes match “pho” today");
  expect(html).toMatch(/aria-live="polite"[^>]*>No dishes found<\/p>/);
});

test("the sheet waits for today's menu to load", () => {
  const html = renderToStaticMarkup(<SearchPanel query="sushi" onQueryChange={() => {}} menu={null} />);

  expect(text(html)).toContain("Loading today’s menus");
});
