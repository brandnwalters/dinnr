// Unit tests: which hall phones show on Menus and Combos (`selectedHall`).
import { expect, test } from "vitest";
import type { MealPeriod } from "@/lib/today";
import { selectedHall } from "./hall-switcher";

const serving = (...names: string[]): MealPeriod[] =>
  names.map((name) => ({ name, start: null, end: null, stations: [], favorites: [] }));

const HALLS = [
  { slug: "top-of-lenoir", mealPeriods: serving("Lunch") },
  { slug: "chase", mealPeriods: serving("Lunch", "Dinner") },
];

test("?hall= wins, even when that hall doesn't serve the selected meal period", () => {
  expect(selectedHall(HALLS, "top-of-lenoir", "Dinner")).toBe("top-of-lenoir");
});

test("without ?hall=, the first hall serving the selected meal period", () => {
  expect(selectedHall(HALLS, undefined, "Dinner")).toBe("chase");
  expect(selectedHall(HALLS, undefined, "Lunch")).toBe("top-of-lenoir");
});

test("an unknown ?hall= falls back like no ?hall=", () => {
  expect(selectedHall(HALLS, "nowhere", "Dinner")).toBe("chase");
});

test("the first hall when no hall serves the meal period or none is selected", () => {
  expect(selectedHall(HALLS, null, "Breakfast")).toBe("top-of-lenoir");
  expect(selectedHall(HALLS, null, null)).toBe("top-of-lenoir");
});

test("no hall at all when there are no halls", () => {
  expect(selectedHall([], null, "Lunch")).toBeNull();
});
