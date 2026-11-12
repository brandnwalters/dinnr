// Seam 3: usual hours in the Today data layer (per weekday, from the most recent saved day on that weekday).
import { afterAll, beforeEach, expect, test } from "vitest";
import { resetDb, seedLocation, seedMenuDay, type SeedMealPeriod } from "../../test/seed";
import { closeDb } from "./db";
import { getToday, type Hall } from "./today";

const LENOIR = { slug: "top-of-lenoir", name: "Top of Lenoir" };
const CHASE = { slug: "chase", name: "Chase" };
const WED_NOON = new Date("2026-11-11T17:00:00Z"); // Wed Nov 11, 12:00 in Chapel Hill

beforeEach(resetDb);
afterAll(closeDb);

const station = { name: "The Grill", items: [{ name: "Grilled Chicken Breast", recipeId: 13708 }] };
const meal = (name: string, start?: string, end?: string): SeedMealPeriod => ({ name, start, end, stations: [station] });

const day = (location: typeof LENOIR, date: string, mealPeriods: SeedMealPeriod[]) =>
  seedMenuDay({ location, date, mealPeriods });

const usualHours = async (slug: string) => {
  const { halls } = await getToday({ now: WED_NOON });
  return halls.find((h: Hall) => h.slug === slug)!.usualHours;
};

test("each weekday, Monday to Sunday, takes its meal periods and hours from the most recent saved day on it", async () => {
  // Three past Mondays: the latest one's hours win.
  await day(LENOIR, "2026-10-26", [meal("Breakfast", "07:00", "10:00"), meal("Lunch", "11:00", "14:00")]);
  await day(LENOIR, "2026-11-02", [meal("Breakfast", "07:00", "10:00"), meal("Lunch", "11:00", "14:00")]);
  await day(LENOIR, "2026-11-09", [meal("Breakfast", "07:30", "10:30"), meal("Lunch", "11:00", "14:30")]);
  // An older Monday saved last doesn't win either.
  await day(LENOIR, "2026-10-19", [meal("Brunch", "10:00", "15:00")]);
  // Today (a Wednesday) counts as the most recent Wednesday.
  await day(LENOIR, "2026-11-04", [meal("Lunch", "11:00", "14:00")]);
  await day(LENOIR, "2026-11-11", [meal("Lunch", "11:00", "15:00"), meal("Dinner", "17:00", "20:00")]);

  const week = await usualHours("top-of-lenoir");

  expect(week.map((d) => d.weekday)).toEqual([
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ]);
  expect(week[0]).toEqual({
    weekday: "Monday",
    status: "open",
    date: "2026-11-09",
    mealPeriods: [
      { name: "Breakfast", start: "07:30", end: "10:30" },
      { name: "Lunch", start: "11:00", end: "14:30" },
    ],
  });
  expect(week[2]).toEqual({
    weekday: "Wednesday",
    status: "open",
    date: "2026-11-11",
    mealPeriods: [
      { name: "Lunch", start: "11:00", end: "15:00" },
      { name: "Dinner", start: "17:00", end: "20:00" },
    ],
  });
});

test("a weekday whose most recent saved day was closed is closed, even if it was open before", async () => {
  await day(LENOIR, "2026-10-31", [meal("Brunch", "10:00", "15:00")]); // Sat, open
  await day(LENOIR, "2026-11-07", []); // the next Sat, closed
  await day(LENOIR, "2026-11-01", []); // Sun, closed
  await day(LENOIR, "2026-11-08", [meal("Brunch", "10:00", "15:00")]); // the next Sun, open again

  const week = await usualHours("top-of-lenoir");

  expect(week[5]).toEqual({ weekday: "Saturday", status: "closed", date: "2026-11-07" });
  expect(week[6]).toMatchObject({ weekday: "Sunday", status: "open", date: "2026-11-08" });
});

test("weekdays with no saved day are unknown, and a hall with no saved days at all has a whole unknown week", async () => {
  await day(LENOIR, "2026-11-10", [meal("Lunch", "11:00", "14:00")]); // Tue only
  await seedLocation(CHASE); // never scraped

  const week = await usualHours("top-of-lenoir");

  expect(week.filter((d) => d.status === "unknown").map((d) => d.weekday)).toEqual([
    "Monday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ]);
  expect(week[1]).toMatchObject({ weekday: "Tuesday", status: "open" });
  expect((await usualHours("chase")).every((d) => d.status === "unknown")).toBe(true);
  expect(await usualHours("chase")).toHaveLength(7);
});

test("each hall has its own usual hours", async () => {
  await day(LENOIR, "2026-11-09", [meal("Lunch", "11:00", "14:00")]);
  await day(CHASE, "2026-11-09", [meal("Breakfast", "07:00", "11:00"), meal("Dinner", "17:00", "21:00")]);
  await day(CHASE, "2026-11-10", []);

  const [lenoir, chase] = (await getToday({ now: WED_NOON })).halls;

  expect(lenoir.usualHours[0]).toMatchObject({ mealPeriods: [{ name: "Lunch", start: "11:00", end: "14:00" }] });
  expect(chase.usualHours[0]).toMatchObject({
    mealPeriods: [
      { name: "Breakfast", start: "07:00", end: "11:00" },
      { name: "Dinner", start: "17:00", end: "21:00" },
    ],
  });
  expect(lenoir.usualHours[1]).toEqual({ weekday: "Tuesday", status: "unknown" });
  expect(chase.usualHours[1]).toEqual({ weekday: "Tuesday", status: "closed", date: "2026-11-10" });
});

test("a meal period without readable hours is listed with null times", async () => {
  await day(LENOIR, "2026-11-06", [meal("Breakfast", "07:00", "10:00"), meal("Late Night")]); // Fri

  const week = await usualHours("top-of-lenoir");

  expect(week[4]).toEqual({
    weekday: "Friday",
    status: "open",
    date: "2026-11-06",
    mealPeriods: [
      { name: "Breakfast", start: "07:00", end: "10:00" },
      { name: "Late Night", start: null, end: null },
    ],
  });
});
