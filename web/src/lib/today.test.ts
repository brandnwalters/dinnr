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
      { name: "Continental", stations: [{ name: "Waffle Bar", items: [{ name: "Waffle", recipeId: 8260 }] }] },
      { name: "Brunch", stations: brunchStations },
    ],
  });

  const today = await getToday({ now: SAT_LUNCHTIME });

  expect(today).toMatchObject({
    date: "2026-11-07",
    halls: [
      {
        slug: "top-of-lenoir",
        name: "Top of Lenoir",
        mealPeriods: [
          { name: "Continental", stations: [{ name: "Waffle Bar", items: [{ name: "Waffle", recipeId: 8260 }] }] },
          { name: "Brunch", stations: brunchStations },
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

test("a hall with no menu saved for today is listed with no meal periods", async () => {
  await seedLocation(LENOIR);
  await seedMenuDay({
    location: LENOIR,
    date: "2026-11-06",
    mealPeriods: [{ name: "Dinner", stations: [{ name: "Pizza", items: [{ name: "Cheese Pizza", recipeId: 7717 }] }] }],
  });

  const today = await getToday({ now: SAT_LUNCHTIME });

  expect(today.halls).toEqual([{ slug: "top-of-lenoir", name: "Top of Lenoir", mealPeriods: [] }]);
});

test("returns both halls, each with its own menu", async () => {
  await seedMenuDay({ location: LENOIR, date: "2026-11-07", mealPeriods: [{ name: "Brunch", stations: brunchStations }] });
  await seedMenuDay({
    location: CHASE,
    date: "2026-11-07",
    mealPeriods: [
      { name: "Brunch", stations: [{ name: "Waffle Bar", items: [{ name: "Waffle", recipeId: 8260 }] }] },
      { name: "Late Lunch", stations: [{ name: "Pizza", items: [{ name: "Pepperoni Pizza", recipeId: 7718 }] }] },
    ],
  });

  const today = await getToday({ now: SAT_LUNCHTIME });

  expect(today.halls).toMatchObject([
    { slug: "top-of-lenoir", name: "Top of Lenoir", mealPeriods: [{ name: "Brunch", stations: brunchStations }] },
    {
      slug: "chase",
      name: "Chase",
      mealPeriods: [
        { name: "Brunch", stations: [{ name: "Waffle Bar", items: [{ name: "Waffle", recipeId: 8260 }] }] },
        { name: "Late Lunch", stations: [{ name: "Pizza", items: [{ name: "Pepperoni Pizza", recipeId: 7718 }] }] },
      ],
    },
  ]);
});

test("a hall with no menu today is still listed next to one that has a menu", async () => {
  await seedLocation(LENOIR);
  await seedMenuDay({ location: CHASE, date: "2026-11-07", mealPeriods: [{ name: "Brunch", stations: brunchStations }] });

  const today = await getToday({ now: SAT_LUNCHTIME });

  expect(today.halls).toMatchObject([
    { slug: "top-of-lenoir", name: "Top of Lenoir", mealPeriods: [] },
    { slug: "chase", name: "Chase", mealPeriods: [{ name: "Brunch", stations: brunchStations }] },
  ]);
});
