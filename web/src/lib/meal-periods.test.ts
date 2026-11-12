// The shared meal-period list: today's meal periods across halls, in serving order, and which one is selected.
import { expect, test } from "vitest";
import { mealPeriodNames, selectedMealPeriod } from "./meal-periods";
import type { Hall, HallStatus } from "./today";

/** A hall serving these meal periods ([name, start, end]), with `current` as its current (or next) one. */
function hall(slug: string, meals: [string, string | null, string | null][], current: string | null = null): Hall {
  const status: HallStatus = meals.length === 0 ? "closed-today" : current ? "serving" : "done-for-today";
  return {
    slug,
    name: slug,
    status,
    currentMealPeriod: current,
    selectedMealPeriod: current,
    favoriteCount: 0,
    usualHours: [],
    mealPeriods: meals.map(([name, start, end]) => ({ name, start, end, favorites: [], stations: [] })),
  };
}

const lenoir = hall("top-of-lenoir", [
  ["Breakfast", "07:00", "10:30"],
  ["Lunch", "11:00", "14:30"],
  ["Dinner", "17:00", "20:00"],
]);
const chase = hall("chase", [
  ["Brunch", "10:00", "14:00"],
  ["Late Lunch", "14:00", "16:30"],
  ["Dinner", "17:00", "21:00"],
]);

test("lists every meal period served today in either hall once, in serving order", () => {
  expect(mealPeriodNames([lenoir, chase])).toEqual(["Breakfast", "Brunch", "Lunch", "Late Lunch", "Dinner"]);
});

test("halls that are closed today add nothing; no halls serving means no meal periods", () => {
  expect(mealPeriodNames([lenoir, hall("chase", [])])).toEqual(["Breakfast", "Lunch", "Dinner"]);
  expect(mealPeriodNames([hall("top-of-lenoir", []), hall("chase", [])])).toEqual([]);
});

test("meal periods without readable hours keep their hall's order, after the timed ones", () => {
  const untimed = hall("chase", [
    ["Snack", null, null],
    ["Lunch", "11:00", "14:00"],
    ["Grab and Go", null, null],
  ]);
  expect(mealPeriodNames([untimed])).toEqual(["Lunch", "Snack", "Grab and Go"]);
});

test("the requested meal period is selected when a hall serves it today", () => {
  expect(selectedMealPeriod([lenoir, chase], "Late Lunch")).toBe("Late Lunch");
});

test("by default the current or next meal period is selected, the earliest across halls", () => {
  const halls = [{ ...lenoir, currentMealPeriod: "Dinner" }, { ...chase, currentMealPeriod: "Late Lunch" }];
  expect(selectedMealPeriod(halls, null)).toBe("Late Lunch");
  // A meal no hall serves today (e.g. an old shared link) falls back to the default too.
  expect(selectedMealPeriod(halls, "Supper")).toBe("Late Lunch");
});

test("once every hall is done for the day, the last meal period stays selected", () => {
  expect(selectedMealPeriod([lenoir, chase], null)).toBe("Dinner");
  expect(selectedMealPeriod([hall("chase", [])], null)).toBeNull();
});
