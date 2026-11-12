// The meal log: logging hall dishes on the dining day, editing and deleting
// entries, per-day totals and pruning, and its on-device store (against an
// in-memory stand-in for localStorage).
import { expect, test } from "vitest";
import { memoryStorage } from "../../test/memory-storage";
import {
  addEntry,
  changeServings,
  dayTotals,
  deleteEntry,
  EMPTY_MEAL_LOG,
  MEAL_LOG_STORAGE_KEY,
  pastDays,
  pruneMealLog,
  unloggableReason,
  type DishToLog,
  type MealLog,
} from "./meal-log";
import { createMealLogStore } from "./meal-log-store";
import { PREFERENCES_STORAGE_KEY } from "./preferences";
import type { MenuItem } from "./today";

const CHICKEN: MenuItem = {
  name: "Grilled Chicken Breast",
  recipeId: 13708,
  normalizedName: "grilled chicken breast",
  favorite: false,
  dietaryTags: [],
  allergens: [],
  nutrition: { servingSize: "1 each", calories: 140, proteinG: 25, carbsG: 0, fatG: 3.5 },
};

const dish = (item: MenuItem = CHICKEN, servings = 1): DishToLog => ({
  item,
  hall: { slug: "chase", name: "Chase" },
  mealPeriod: "Dinner",
  servings,
});

/** 6:30pm in Chapel Hill (EST) on 2026-11-11. */
const EVENING = new Date("2026-11-11T23:30:00Z");

test("logging a dish records it on the dining day with its hall, meal period, servings and per-serving macros", () => {
  const log = addEntry(EMPTY_MEAL_LOG, dish(CHICKEN, 1.5), EVENING);

  expect(log.entries).toEqual([
    {
      id: expect.any(String),
      date: "2026-11-11",
      hall: { slug: "chase", name: "Chase" },
      mealPeriod: "Dinner",
      name: "Grilled Chicken Breast",
      normalizedName: "grilled chicken breast",
      recipeId: 13708,
      servings: 1.5,
      perServing: { calories: 140, proteinG: 25, carbsG: 0, fatG: 3.5 },
    },
  ]);
});

test("a dish logged just before local midnight lands on that day, just after on the next", () => {
  const beforeMidnight = addEntry(EMPTY_MEAL_LOG, dish(), new Date("2026-11-12T04:59:00Z")); // 11:59pm EST
  const afterMidnight = addEntry(EMPTY_MEAL_LOG, dish(), new Date("2026-11-12T05:01:00Z")); // 12:01am EST
  const summerLateNight = addEntry(EMPTY_MEAL_LOG, dish(), new Date("2026-07-15T03:30:00Z")); // 11:30pm EDT

  expect(beforeMidnight.entries[0].date).toBe("2026-11-11");
  expect(afterMidnight.entries[0].date).toBe("2026-11-12");
  expect(summerLateNight.entries[0].date).toBe("2026-07-14");
});

test("a dish without all four macros can't be logged, and says why", () => {
  const noNutrition: MenuItem = { ...CHICKEN, nutrition: undefined };
  const noFat: MenuItem = { ...CHICKEN, nutrition: { ...CHICKEN.nutrition!, fatG: null } };

  expect(unloggableReason(CHICKEN)).toBeNull();
  expect(unloggableReason(noNutrition)).toMatch(/no nutrition/i);
  expect(unloggableReason(noFat)).toMatch(/no nutrition/i);
  expect(addEntry(EMPTY_MEAL_LOG, dish(noNutrition), EVENING)).toEqual(EMPTY_MEAL_LOG);
  expect(addEntry(EMPTY_MEAL_LOG, dish(noFat), EVENING)).toEqual(EMPTY_MEAL_LOG);
});

const RICE: MenuItem = {
  ...CHICKEN,
  name: "Brown Rice",
  recipeId: 2,
  normalizedName: "brown rice",
  nutrition: { servingSize: "1 cup", calories: 200, proteinG: 4, carbsG: 44, fatG: 1.5 },
};

test("an entry's servings can be changed (in ½ steps) and an entry deleted, leaving the others", () => {
  let log = addEntry(EMPTY_MEAL_LOG, dish(CHICKEN), EVENING);
  log = addEntry(log, dish(RICE), EVENING);
  const [chicken, rice] = log.entries;

  const changed = changeServings(log, chicken.id, 2.5);
  expect(changed.entries.map((e) => [e.name, e.servings])).toEqual([
    ["Grilled Chicken Breast", 2.5],
    ["Brown Rice", 1],
  ]);
  expect(changeServings(log, chicken.id, 0)).toEqual(log);
  expect(changeServings(log, chicken.id, 0.75)).toEqual(log);

  expect(deleteEntry(changed, chicken.id).entries).toEqual([rice]);
  expect(deleteEntry(changed, "no-such-id")).toEqual(changed);
});

test("a day's totals add each entry's per-serving macros times its servings, and only that day's", () => {
  let log = addEntry(EMPTY_MEAL_LOG, dish(CHICKEN, 2), EVENING); // 280 cal, 50 g protein, 0 carbs, 7 g fat
  log = addEntry(log, dish(RICE, 0.5), EVENING); // 100 cal, 2 g protein, 22 g carbs, 0.75 g fat
  log = addEntry(log, dish(RICE), new Date("2026-11-10T23:30:00Z")); // the day before

  expect(dayTotals(log, "2026-11-11")).toEqual({ calories: 380, proteinG: 52, carbsG: 22, fatG: 7.75 });
  expect(dayTotals(log, "2026-11-10")).toEqual({ calories: 200, proteinG: 4, carbsG: 44, fatG: 1.5 });
  expect(dayTotals(log, "2026-11-09")).toEqual({ calories: 0, proteinG: 0, carbsG: 0, fatG: 0 });
});

/** A log with one chicken entry on each of `dates` (logged at 6:30pm EST). */
const logOn = (...dates: string[]): MealLog =>
  dates.reduce((log, d) => addEntry(log, dish(), new Date(`${d}T23:30:00Z`)), EMPTY_MEAL_LOG);

test("pruning keeps today and the previous 7 days, dropping older entries", () => {
  const log = logOn("2026-10-31", "2026-11-03", "2026-11-04", "2026-11-10", "2026-11-11");

  expect(pruneMealLog(log, "2026-11-11").entries.map((e) => e.date)).toEqual([
    "2026-11-04",
    "2026-11-10",
    "2026-11-11",
  ]);
  // Across a month boundary.
  expect(pruneMealLog(logOn("2026-11-24", "2026-11-25"), "2026-12-02").entries.map((e) => e.date)).toEqual([
    "2026-11-25",
  ]);
});

test("the past 7 days list each earlier day with entries, newest first, with its entries and totals", () => {
  let log = logOn("2026-11-03", "2026-11-04", "2026-11-09", "2026-11-11");
  log = addEntry(log, dish(RICE, 2), new Date("2026-11-09T17:00:00Z"));

  const days = pastDays(log, "2026-11-11");

  expect(days.map((d) => d.date)).toEqual(["2026-11-09", "2026-11-04"]);
  expect(days[0].entries.map((e) => e.name)).toEqual(["Grilled Chicken Breast", "Brown Rice"]);
  expect(days[0].totals).toEqual({ calories: 540, proteinG: 33, carbsG: 88, fatG: 6.5 });
});

test("the log survives a reload (a new store over the same storage), beside the preferences key", () => {
  const storage = memoryStorage();
  createMealLogStore(storage, () => EVENING).update((log) => addEntry(log, dish(CHICKEN, 1.5), EVENING));

  const afterReload = createMealLogStore(storage, () => EVENING).get();

  expect(afterReload.entries.map((e) => [e.name, e.servings])).toEqual([["Grilled Chicken Breast", 1.5]]);
  expect(MEAL_LOG_STORAGE_KEY).not.toBe(PREFERENCES_STORAGE_KEY);
  expect(storage.getItem(MEAL_LOG_STORAGE_KEY)).toContain('"version":1');
});

test("subscribers hear about updates", () => {
  const store = createMealLogStore(memoryStorage(), () => EVENING);
  const seen: number[] = [];
  store.subscribe(() => seen.push(store.get().entries.length));

  store.update((log) => addEntry(log, dish(), EVENING));

  expect(seen).toEqual([1]);
});

test("entries older than 7 days are dropped when the log is read, as the days go by", () => {
  const storage = memoryStorage();
  createMealLogStore(storage, () => EVENING).update((log) => addEntry(log, dish(), EVENING));

  const sevenDaysOn = createMealLogStore(storage, () => new Date("2026-11-18T23:30:00Z")).get();
  const eightDaysOn = createMealLogStore(storage, () => new Date("2026-11-19T23:30:00Z")).get();

  expect(sevenDaysOn.entries).toHaveLength(1);
  expect(eightDaysOn.entries).toEqual([]);
});

test("unreadable, old or tampered stored data falls back safely, entry by entry", () => {
  const stored = (value: unknown) =>
    createMealLogStore(memoryStorage({ [MEAL_LOG_STORAGE_KEY]: JSON.stringify(value) }), () => EVENING).get();
  const good = addEntry(EMPTY_MEAL_LOG, dish(), EVENING).entries[0];

  expect(createMealLogStore(memoryStorage({ [MEAL_LOG_STORAGE_KEY]: "{not json" }), () => EVENING).get()).toEqual(
    EMPTY_MEAL_LOG,
  );
  expect(stored(null)).toEqual(EMPTY_MEAL_LOG);
  expect(stored([good])).toEqual(EMPTY_MEAL_LOG);
  expect(stored({ version: 0, entries: [good] })).toEqual(EMPTY_MEAL_LOG);
  expect(stored({ version: 999, entries: [good] })).toEqual(EMPTY_MEAL_LOG);
  expect(stored({ version: 1, entries: "nope" })).toEqual(EMPTY_MEAL_LOG);
  expect(
    stored({
      version: 1,
      entries: [
        good,
        { ...good, id: "b", servings: 0.3 },
        { ...good, id: "c", date: "11/11/2026" },
        { ...good, id: "d", perServing: { ...good.perServing, fatG: "lots" } },
        { ...good, id: "e", hall: "Chase" },
        { ...good, id: "f", recipeId: undefined },
        7,
      ],
    }).entries,
  ).toEqual([good]);
});

test("a device where storage throws (private mode, quota) still logs for the session", () => {
  const broken = memoryStorage();
  broken.getItem = () => {
    throw new Error("SecurityError");
  };
  broken.setItem = () => {
    throw new Error("QuotaExceededError");
  };
  const store = createMealLogStore(broken, () => EVENING);

  store.update((log) => addEntry(log, dish(), EVENING));

  expect(store.get().entries).toHaveLength(1);
});

test("servings are logged in ½ steps, at least ½", () => {
  expect(addEntry(EMPTY_MEAL_LOG, dish(CHICKEN, 0.5), EVENING).entries[0].servings).toBe(0.5);
  for (const bad of [0, -1, 0.25, 1.3, Number.NaN]) {
    expect(addEntry(EMPTY_MEAL_LOG, dish(CHICKEN, bad), EVENING)).toEqual(EMPTY_MEAL_LOG);
  }
});
