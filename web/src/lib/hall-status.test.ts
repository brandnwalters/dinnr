// How hall statuses and meal-period hours read: clock times, hours ranges and status tones.
import { expect, test } from "vitest";
import { clock, hours, statusTone } from "./hall-status";
import type { Hall, HallStatus } from "./today";

test("clock times drop :00 and use am/pm, with noon and midnight as 12", () => {
  expect(clock("17:00")).toBe("5pm");
  expect(clock("10:30")).toBe("10:30am");
  expect(clock("12:00")).toBe("12pm");
  expect(clock("00:05")).toBe("12:05am");
});

test("a meal period's hours span its start and end, or are null without both", () => {
  const meal = { name: "Lunch", favorites: [], stations: [] };
  expect(hours({ ...meal, start: "11:00", end: "14:30" })).toBe("11am–2:30pm");
  expect(hours({ ...meal, start: "11:00", end: null })).toBeNull();
});

test("closed, done-for-today and no-menu halls share the closed tone", () => {
  const hall = (status: HallStatus): Hall => ({
    slug: "chase",
    name: "Chase",
    status,
    currentMealPeriod: null,
    selectedMealPeriod: null,
    favoriteCount: 0,
    usualHours: [],
    mealPeriods: [],
  });
  expect(statusTone(hall("serving"))).toBe("serving");
  expect(statusTone(hall("opens-later"))).toBe("opens-later");
  for (const status of ["done-for-today", "closed-today", "no-menu"] as const) expect(statusTone(hall(status))).toBe("closed");
});
