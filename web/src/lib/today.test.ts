// Seam 3: the Today data layer against a seeded database.
import { afterAll, beforeEach, expect, test } from "vitest";
import { resetDb, seedLocation, seedMenuDay } from "../../test/seed";
import { closeDb } from "./db";
import { getToday } from "./today";

const LENOIR = { slug: "top-of-lenoir", name: "Top of Lenoir" };
const CHASE = { slug: "chase", name: "Chase" };

// Saturday 2026-11-07, 12:30 in Chapel Hill (EST, UTC-5).
const SAT_LUNCHTIME = new Date("2026-11-07T17:30:00Z");

beforeEach(resetDb);
afterAll(closeDb);

const brunchStations = [
  {
    name: "The Grill",
    items: [
      { name: "Nashville Hot Chicken Biscuit", recipeId: 15469 },
      { name: "Black Bean Burger Patty", recipeId: 5810 },
    ],
  },
  { name: "Pizza", items: [{ name: "Cheese Pizza", recipeId: 7717 }] },
];

test("returns today's menu grouped by meal period, then station, in page order", async () => {
  await seedMenuDay({
    location: LENOIR,
    date: "2026-11-07",
    mealPeriods: [
      {
        name: "Continental",
        start: "10:00",
        end: "11:00",
        stations: [{ name: "Waffle Bar", items: [{ name: "Waffle", recipeId: 8260 }] }],
      },
      { name: "Brunch", start: "11:00", end: "15:00", stations: brunchStations },
    ],
  });

  const today = await getToday({ now: SAT_LUNCHTIME });

  expect(today).toEqual({
    date: "2026-11-07",
    halls: [
      {
        slug: "top-of-lenoir",
        name: "Top of Lenoir",
        status: "serving",
        currentMealPeriod: "Brunch",
        selectedMealPeriod: "Brunch",
        mealPeriods: [
          {
            name: "Continental",
            start: "10:00",
            end: "11:00",
            stations: [{ name: "Waffle Bar", items: [{ name: "Waffle", recipeId: 8260 }] }],
          },
          { name: "Brunch", start: "11:00", end: "15:00", stations: brunchStations },
        ],
      },
    ],
  });
});

test("a station shared by two meal periods keeps each meal period's items apart", async () => {
  await seedMenuDay({
    location: LENOIR,
    date: "2026-11-07",
    mealPeriods: [
      { name: "Continental", stations: [{ name: "Waffle Bar", items: [{ name: "Waffle", recipeId: 8260 }] }] },
      {
        name: "Brunch",
        stations: [{ name: "Waffle Bar", items: [{ name: "Pancake Syrup", recipeId: 10329 }] }],
      },
    ],
  });

  const [hall] = (await getToday({ now: SAT_LUNCHTIME })).halls;

  expect(hall.mealPeriods.map((mp) => mp.stations[0].items.map((i) => i.name))).toEqual([
    ["Waffle"],
    ["Pancake Syrup"],
  ]);
});

test("'today' is the date in Chapel Hill, not UTC", async () => {
  const menuOn = (date: string, item: string) =>
    seedMenuDay({
      location: LENOIR,
      date,
      mealPeriods: [{ name: "Dinner", stations: [{ name: "The Grill", items: [{ name: item, recipeId: 1 }] }] }],
    });
  await menuOn("2026-11-07", "Saturday burger");
  await menuOn("2026-11-08", "Sunday burger");

  // 22:00 Saturday in Chapel Hill is already Sunday in UTC.
  const today = await getToday({ now: new Date("2026-11-08T03:00:00Z") });

  expect(today.date).toBe("2026-11-07");
  expect(today.halls[0].mealPeriods[0].stations[0].items[0].name).toBe("Saturday burger");
});

test("a hall with no menu saved for today is listed as 'no-menu' with no meal periods", async () => {
  await seedLocation(LENOIR);
  await seedMenuDay({
    location: LENOIR,
    date: "2026-11-06",
    mealPeriods: [{ name: "Dinner", stations: [{ name: "Pizza", items: [{ name: "Cheese Pizza", recipeId: 7717 }] }] }],
  });

  const today = await getToday({ now: SAT_LUNCHTIME });

  expect(today.halls).toEqual([
    {
      slug: "top-of-lenoir",
      name: "Top of Lenoir",
      status: "no-menu",
      currentMealPeriod: null,
      selectedMealPeriod: null,
      mealPeriods: [],
    },
  ]);
});

// Meal hours and the current / next meal period. A weekday at Lenoir (EST, UTC-5).
const station = (item: string, recipeId: number) => [
  { name: "The Grill", items: [{ name: item, recipeId }] },
];
const weekday = () =>
  seedMenuDay({
    location: LENOIR,
    date: "2026-11-09",
    mealPeriods: [
      { name: "Breakfast", start: "07:00", end: "10:30", stations: station("Pancakes", 1) },
      { name: "Lunch", start: "11:00", end: "15:00", stations: station("Burger", 2) },
      { name: "Dinner", start: "17:00", end: "20:00", stations: station("Steak", 3) },
    ],
  });
/** `hhmm` on Monday 2026-11-09 in Chapel Hill. */
const mondayAt = (hhmm: string) => new Date(`2026-11-09T${hhmm}:00-05:00`);

test("during a meal, the hall is serving and that meal is selected", async () => {
  await weekday();

  const [hall] = (await getToday({ now: mondayAt("12:30") })).halls;

  expect(hall.status).toBe("serving");
  expect(hall.currentMealPeriod).toBe("Lunch");
  expect(hall.selectedMealPeriod).toBe("Lunch");
  expect(hall.mealPeriods.map((mp) => [mp.name, mp.start, mp.end])).toEqual([
    ["Breakfast", "07:00", "10:30"],
    ["Lunch", "11:00", "15:00"],
    ["Dinner", "17:00", "20:00"],
  ]);
});

test.each([
  ["06:00", "Breakfast"], // before the first meal
  ["10:45", "Lunch"],
  ["15:00", "Dinner"], // Lunch ends at 15:00 sharp
  ["16:00", "Dinner"],
])("between meals at %s, the next meal (%s) is selected", async (time, next) => {
  await weekday();

  const [hall] = (await getToday({ now: mondayAt(time) })).halls;

  expect([hall.status, hall.currentMealPeriod, hall.selectedMealPeriod]).toEqual(["opens-later", next, next]);
});

test("after the last meal, the hall is done for today", async () => {
  await weekday();

  const [hall] = (await getToday({ now: mondayAt("20:00") })).halls;

  expect([hall.status, hall.currentMealPeriod, hall.selectedMealPeriod]).toEqual(["done-for-today", null, null]);
  // Today's meals are still there to switch to.
  expect(hall.mealPeriods.map((mp) => mp.name)).toEqual(["Breakfast", "Lunch", "Dinner"]);
});

test("a hall saved as closed for the day is reported closed", async () => {
  await seedMenuDay({ location: LENOIR, date: "2026-11-09", mealPeriods: [] });

  const [hall] = (await getToday({ now: mondayAt("12:30") })).halls;

  expect(hall).toEqual({
    slug: "top-of-lenoir",
    name: "Top of Lenoir",
    status: "closed-today",
    currentMealPeriod: null,
    selectedMealPeriod: null,
    mealPeriods: [],
  });
});

test("switching to another of today's meals selects it but keeps the status at now", async () => {
  await weekday();

  const [hall] = (await getToday({ now: mondayAt("12:30"), mealPeriod: "Dinner" })).halls;

  expect([hall.status, hall.currentMealPeriod, hall.selectedMealPeriod]).toEqual(["serving", "Lunch", "Dinner"]);
});

test("a switched-to meal a hall doesn't serve falls back to that hall's current meal", async () => {
  await weekday();
  await seedMenuDay({
    location: CHASE,
    date: "2026-11-09",
    mealPeriods: [
      { name: "Lunch", start: "11:00", end: "15:00", stations: station("Pizza", 4) },
      { name: "Late Lunch", start: "15:00", end: "17:00", stations: station("Wings", 5) },
    ],
  });

  const halls = (await getToday({ now: mondayAt("12:30"), mealPeriod: "Late Lunch" })).halls;

  expect(halls.map((h) => [h.slug, h.selectedMealPeriod])).toEqual([
    ["top-of-lenoir", "Lunch"],
    ["chase", "Late Lunch"],
  ]);
});

test("returns both halls, each with its own menu", async () => {
  const brunch = { name: "Brunch", start: "11:00", end: "15:00" };
  const waffles = [{ name: "Waffle Bar", items: [{ name: "Waffle", recipeId: 8260 }] }];
  const lateLunch = { name: "Late Lunch", start: "15:00", end: "17:00" };
  const pizza = [{ name: "Pizza", items: [{ name: "Pepperoni Pizza", recipeId: 7718 }] }];
  await seedMenuDay({ location: LENOIR, date: "2026-11-07", mealPeriods: [{ ...brunch, stations: brunchStations }] });
  await seedMenuDay({
    location: CHASE,
    date: "2026-11-07",
    mealPeriods: [
      { ...brunch, stations: waffles },
      { ...lateLunch, stations: pizza },
    ],
  });

  const today = await getToday({ now: SAT_LUNCHTIME });

  const serving = { status: "serving", currentMealPeriod: "Brunch", selectedMealPeriod: "Brunch" };
  expect(today.halls).toEqual([
    { slug: "top-of-lenoir", name: "Top of Lenoir", ...serving, mealPeriods: [{ ...brunch, stations: brunchStations }] },
    {
      slug: "chase",
      name: "Chase",
      ...serving,
      mealPeriods: [
        { ...brunch, stations: waffles },
        { ...lateLunch, stations: pizza },
      ],
    },
  ]);
});

test("a hall with no menu today is still listed next to one that has a menu", async () => {
  await seedLocation(LENOIR);
  await seedMenuDay({
    location: CHASE,
    date: "2026-11-07",
    mealPeriods: [{ name: "Brunch", start: "11:00", end: "15:00", stations: brunchStations }],
  });

  const today = await getToday({ now: SAT_LUNCHTIME });

  expect(today.halls.map((h) => [h.slug, h.status, h.mealPeriods.length])).toEqual([
    ["top-of-lenoir", "no-menu", 0],
    ["chase", "serving", 1],
  ]);
});
