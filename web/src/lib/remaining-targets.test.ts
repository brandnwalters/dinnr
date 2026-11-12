// Remaining targets: what's left of the daily targets after today's log, sized for one suggestion, checked end to
// end through the combo engine.
import { expect, test } from "vitest";
import { suggestCombos, type ComboItem, type MacroTargets } from "./combos";
import { addEntry, EMPTY_MEAL_LOG, type LogEntry } from "./meal-log";
import { remainingTargets, targetMode, type TargetMode } from "./remaining-targets";
import type { MenuItem } from "./today";

const dish = (name: string, recipeId: number, calories: number, proteinG: number): MenuItem => ({
  name,
  normalizedName: name.toLowerCase(),
  recipeId,
  dietaryTags: [],
  allergens: [],
  favorite: false,
  nutrition: { servingSize: "1 each", calories, proteinG, carbsG: 0, fatG: 0 },
});

const CHICKEN = dish("Grilled Chicken", 1, 140, 25);
const SALMON = dish("Salmon", 2, 300, 34);
const STEAK = dish("Steak", 3, 500, 60);

const comboItem = ({ recipeId, name, nutrition }: MenuItem): ComboItem => ({
  id: recipeId,
  name,
  station: "Grill",
  macros: { calories: nutrition!.calories!, proteinG: nutrition!.proteinG!, carbsG: 0, fatG: 0 },
});
const MENU = [CHICKEN, SALMON, STEAK].map(comboItem);

const NOW = new Date("2026-11-11T17:30:00Z"); // 12:30pm in Chapel Hill
const LENOIR = { slug: "top-of-lenoir", name: "Top of Lenoir" };

/** Today's log entries: each dish at `servings`, logged at the given meal period. */
const logged = (...dishes: [MenuItem, number, string][]): LogEntry[] =>
  dishes.reduce(
    (log, [item, servings, mealPeriod]) => addEntry(log, { item, hall: LENOIR, mealPeriod, servings }, NOW),
    EMPTY_MEAL_LOG,
  ).entries;

const remaining = (
  targets: MacroTargets,
  todayEntries: LogEntry[],
  mode: TargetMode = "left",
  { mealPeriods = ["Breakfast", "Lunch", "Dinner"], selectedMeal = "Lunch" } = {},
) => remainingTargets({ targets, todayEntries, mode, mealPeriods, selectedMeal });

/** The names in each suggested combo, e.g. "2× Grilled Chicken". */
const suggested = (targets: MacroTargets) =>
  suggestCombos({ items: MENU, targets }).combos.map((c) => c.items.map(({ item, servings }) => `${servings}× ${item.name}`).join(" + "));

test("'Fill what's left today' subtracts today's logged totals from each min and max", () => {
  // Eaten: 2× Chicken = 280 cal, 50 g protein.
  const result = remaining({ proteinG: { min: 60, max: 100 }, calories: { max: 800 } }, logged([CHICKEN, 2, "Breakfast"]));

  expect(result).toEqual({ targets: { proteinG: { min: 10, max: 50 }, calories: { max: 520 } }, message: null });
  const combos = suggested(result.targets!);
  expect(combos).toContain("1× Salmon");
  expect(combos.some((c) => c.includes("Steak"))).toBe(false); // 60 g is over what's left of the max
});

test("a min already met is floored at 0, so any combo within what's left of the max fits", () => {
  // Eaten: 2× Steak = 1000 cal, 120 g protein.
  const result = remaining({ proteinG: { min: 100 }, calories: { max: 1400 } }, logged([STEAK, 2, "Breakfast"]));

  expect(result.targets).toEqual({ proteinG: { min: 0 }, calories: { max: 400 } });
  expect(suggested(result.targets!)).toEqual(expect.arrayContaining(["1× Grilled Chicken", "1× Salmon"]));
});

test("a daily max already reached gives a clear message and no targets to suggest from", () => {
  // Eaten: Steak + Salmon = 800 cal, 94 g protein.
  const entries = logged([STEAK, 1, "Breakfast"], [SALMON, 1, "Breakfast"]);

  for (const mode of ["left", "per-meal"] as const) {
    const result = remaining({ calories: { max: 800 }, proteinG: { min: 150 } }, entries, mode);
    expect(result.targets).toBeNull();
    expect(result.message).toBe("You've reached today's calorie maximum (800 cal), so there's nothing left to fill.");
  }
  const both = remaining({ calories: { max: 700 }, proteinG: { max: 90 } }, entries);
  expect(both.message).toBe(
    "You've reached today's calorie and protein maximums (700 cal, 90 g), so there's nothing left to fill.",
  );
});

const EGG = dish("Egg", 4, 70, 5);

test("'Per meal' splits what's left evenly across the hall's meal periods with no entries, counting the selected one", () => {
  const targets = { proteinG: { min: 90, max: 150 } };

  // Nothing logged: Breakfast, Lunch and Dinner each get a third.
  const fresh = remaining(targets, [], "per-meal");
  expect(fresh.targets).toEqual({ proteinG: { min: 30, max: 50 } });
  expect(suggested(fresh.targets!)).toContain("1× Salmon");
  expect(suggested(fresh.targets!).some((c) => c.includes("Steak"))).toBe(false);

  // 30 g at Breakfast: what's left (60–120 g) splits across Lunch and Dinner.
  const breakfast = logged([CHICKEN, 1, "Breakfast"], [EGG, 1, "Breakfast"]);
  expect(remaining(targets, breakfast, "per-meal").targets).toEqual({ proteinG: { min: 30, max: 60 } });

  // Lunch already has an entry but is the selected meal, so it still counts: Lunch and Dinner share what's left.
  const lunch = logged([CHICKEN, 1, "Breakfast"], [EGG, 1, "Lunch"]);
  expect(remaining(targets, lunch, "per-meal").targets).toEqual({ proteinG: { min: 30, max: 60 } });

  // Only meal periods this hall serves count (a Brunch hall splits across Brunch and Dinner).
  const brunch = remaining(targets, [], "per-meal", { mealPeriods: ["Brunch", "Dinner"], selectedMeal: "Brunch" });
  expect(brunch.targets).toEqual({ proteinG: { min: 45, max: 75 } });
  expect(suggested(brunch.targets!)).toContain("1× Steak");
});

test("the mode defaults to 'Fill what's left today' once anything is logged today, else 'Per meal'", () => {
  expect(targetMode(undefined, [])).toBe("per-meal");
  expect(targetMode(undefined, logged([EGG, 1, "Breakfast"]))).toBe("left");
  // A chosen mode wins; anything else falls back to the default.
  expect(targetMode("per-meal", logged([EGG, 1, "Breakfast"]))).toBe("per-meal");
  expect(targetMode("left", [])).toBe("left");
  expect(targetMode("bogus", [])).toBe("per-meal");

  // End to end: with 50 g eaten of 60–100 g, the default mode suggests from what's left (10–50 g).
  const entries = logged([CHICKEN, 2, "Breakfast"]);
  const result = remaining({ proteinG: { min: 60, max: 100 } }, entries, targetMode(undefined, entries));
  expect(suggested(result.targets!).some((c) => c.includes("Steak"))).toBe(false);
});
