// Search: today's dishes across both halls and every meal period, by name.
import { expect, test } from "vitest";
import { searchDishes } from "./dish-search";
import type { Hall, MealPeriod, MenuItem, Station, TodayMenu } from "./today";

const item = (name: string, recipeId = 1): MenuItem => ({
  name,
  recipeId,
  normalizedName: name.toLowerCase(),
  favorite: false,
  dietaryTags: [],
  allergens: [],
});

const station = (name: string, ...names: string[]): Station => ({ name, items: names.map((n) => item(n)) });

const meal = (name: string, stations: Station[], hiddenByFilters?: string[]): MealPeriod => ({
  name,
  start: null,
  end: null,
  favorites: [],
  stations,
  ...(hiddenByFilters && { hiddenByFilters }),
});

const hall = (slug: string, name: string, mealPeriods: MealPeriod[]): Hall => ({
  slug,
  name,
  status: "serving",
  currentMealPeriod: mealPeriods[0]?.name ?? null,
  selectedMealPeriod: mealPeriods[0]?.name ?? null,
  favoriteCount: 0,
  mealPeriods,
});

const menu = (...halls: Hall[]): TodayMenu => ({ date: "2026-11-11", halls, favoritesLastServed: {} });

/** Each result as "hall / meal / station / dish", in the order shown. */
const lines = (search: ReturnType<typeof searchDishes>) =>
  search.halls.flatMap((h) =>
    h.mealPeriods.flatMap((m) => m.results.map((r) => `${h.name} / ${m.name} / ${r.station} / ${r.item.name}`)),
  );

test("matches any part of a dish name, regardless of case", () => {
  const today = menu(
    hall("chase", "Chase", [
      meal("Lunch", [station("Sushi", "California Sushi Roll", "Spicy Tuna Roll", "SUSHI RICE", "Edamame")]),
    ]),
  );

  expect(lines(searchDishes("sushi", today))).toEqual([
    "Chase / Lunch / Sushi / California Sushi Roll",
    "Chase / Lunch / Sushi / SUSHI RICE",
  ]);
});

test("results cover both halls and every meal period, grouped by hall then meal period, each with its station", () => {
  const today = menu(
    hall("chase", "Chase", [
      meal("Breakfast", [station("Grill", "Bacon")]),
      meal("Lunch", [station("Grill", "Cheeseburger"), station("Deli", "Turkey Club")]),
      meal("Dinner", [station("Wok", "Lo Mein")]),
    ]),
    hall("top-of-lenoir", "Top of Lenoir", [
      meal("Lunch", [station("Pizza", "Cheese Pizza")]),
      meal("Dinner", [station("Grill", "Cheeseburger")]),
    ]),
  );

  const search = searchDishes("ch", today);

  expect(search.halls.map((h) => [h.name, h.mealPeriods.map((m) => m.name)])).toEqual([
    ["Chase", ["Lunch"]],
    ["Top of Lenoir", ["Lunch", "Dinner"]],
  ]);
  expect(lines(search)).toEqual([
    "Chase / Lunch / Grill / Cheeseburger",
    "Top of Lenoir / Lunch / Pizza / Cheese Pizza",
    "Top of Lenoir / Dinner / Grill / Cheeseburger",
  ]);
});

test("Extras stations (condiments, beverages, ...) are searched too", () => {
  const today = menu(
    hall("chase", "Chase", [
      meal("Lunch", [
        station("Grill", "Chocolate Chip Cookie"),
        { name: "Beverages", excludedFromCombos: true, items: [item("Chocolate Milk")] },
      ]),
    ]),
  );

  expect(lines(searchDishes("chocolate", today))).toEqual([
    "Chase / Lunch / Grill / Chocolate Chip Cookie",
    "Chase / Lunch / Beverages / Chocolate Milk",
  ]);
});

test("counts the results, and the matches the filters hid (which never appear)", () => {
  const today = menu(
    hall("chase", "Chase", [
      meal("Lunch", [station("Grill", "Cheeseburger", "Veggie Burger")], ["Bacon Burger", "Fries"]),
      meal("Dinner", [], ["Burger Bowl"]),
    ]),
    hall("top-of-lenoir", "Top of Lenoir", [meal("Lunch", [station("Grill", "Black Bean Burger")], ["BURGER BUN"])]),
  );

  const search = searchDishes("burger", today);

  expect(search.count).toBe(3);
  expect(search.hidden).toBe(3);
  expect(lines(search)).not.toContainEqual(expect.stringContaining("Bacon Burger"));
});

test("a query with no matches finds nothing", () => {
  const today = menu(hall("chase", "Chase", [meal("Lunch", [station("Grill", "Cheeseburger")], ["Fries"])]));

  expect(searchDishes("sushi", today)).toEqual({ halls: [], count: 0, hidden: 0 });
});

test("an empty or blank query finds nothing (the sheet shows a hint instead)", () => {
  const today = menu(hall("chase", "Chase", [meal("Lunch", [station("Grill", "Cheeseburger")], ["Fries"])]));

  expect(searchDishes("", today)).toEqual({ halls: [], count: 0, hidden: 0 });
  expect(searchDishes("   ", today)).toEqual({ halls: [], count: 0, hidden: 0 });
});

test("surrounding spaces in the query are ignored", () => {
  const today = menu(hall("chase", "Chase", [meal("Lunch", [station("Grill", "Cheeseburger")])]));

  expect(lines(searchDishes("  cheese ", today))).toEqual(["Chase / Lunch / Grill / Cheeseburger"]);
});
