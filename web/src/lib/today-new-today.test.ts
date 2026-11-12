// Seam 3: New today in the Today data layer (a dish its hall hasn't served in the previous 14 days, once the hall has 14 days of history).
import { afterAll, beforeEach, expect, test } from "vitest";
import { resetDb, seedMenuDay, type SeedLocation, type SeedStation } from "../../test/seed";
import { closeDb } from "./db";
import { getToday, type MenuItem, type TodayMenu } from "./today";

const LENOIR = { slug: "top-of-lenoir", name: "Top of Lenoir" };
const CHASE = { slug: "chase", name: "Chase" };
const SAT_LUNCHTIME = new Date("2026-11-07T17:30:00Z"); // 12:30 in Chapel Hill on Sat Nov 7
const TODAY = "2026-11-07";

beforeEach(resetDb);
afterAll(closeDb);

/** The date `days` before Sat Nov 7, as YYYY-MM-DD. */
const daysBefore = (days: number) => {
  const d = new Date(`${TODAY}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
};

const lunch = (stations: SeedStation[]) => [{ name: "Lunch", start: "11:00", end: "15:00", stations }];
const grill = (...items: string[]): SeedStation => ({
  name: "The Grill",
  items: items.map((name, i) => ({ name, recipeId: 100 + i })),
});

/**
 * Seed `days` saved menu days at `location`, on each of the `days` days before
 * today, serving "Rice" plus whatever `extra` lists for that many days back.
 */
async function seedHistory(location: SeedLocation, days: number, extra: Record<number, string[]> = {}) {
  for (let back = 1; back <= days; back++) {
    await seedMenuDay({ location, date: daysBefore(back), mealPeriods: lunch([grill("Rice", ...(extra[back] ?? []))]) });
  }
}

const item = (menu: TodayMenu, hall: string, name: string): MenuItem =>
  menu.halls
    .find((h) => h.name === hall)!
    .mealPeriods.flatMap((mp) => mp.stations.flatMap((s) => s.items))
    .find((i) => i.name === name)!;

test("a dish its hall served in the previous 14 days isn't new; one last served 15 days back, or never, is", async () => {
  await seedHistory(LENOIR, 20, { 14: ["Pot Roast"], 15: ["Sushi Roll"] });
  await seedMenuDay({
    location: LENOIR,
    date: TODAY,
    mealPeriods: lunch([grill("Rice", "Pot Roast", "Sushi Roll", "Jerk Chicken")]),
  });

  const menu = await getToday({ now: SAT_LUNCHTIME });

  expect(item(menu, "Top of Lenoir", "Rice")).not.toHaveProperty("newToday");
  expect(item(menu, "Top of Lenoir", "Pot Roast")).not.toHaveProperty("newToday");
  expect(item(menu, "Top of Lenoir", "Sushi Roll").newToday).toBe(true);
  expect(item(menu, "Top of Lenoir", "Jerk Chicken").newToday).toBe(true);
});

test("nothing is new at a hall with fewer than 14 saved menu days before today", async () => {
  await seedHistory(LENOIR, 13);
  await seedHistory(CHASE, 14);
  const today = lunch([grill("Rice", "Jerk Chicken")]);
  await seedMenuDay({ location: LENOIR, date: TODAY, mealPeriods: today });
  await seedMenuDay({ location: CHASE, date: TODAY, mealPeriods: today });
  // Days saved under later dates (after UNC's evening rollover) don't count as history.
  await seedMenuDay({ location: LENOIR, date: "2026-11-08", mealPeriods: today });

  const menu = await getToday({ now: SAT_LUNCHTIME });

  expect(item(menu, "Top of Lenoir", "Jerk Chicken")).not.toHaveProperty("newToday");
  expect(item(menu, "Chase", "Jerk Chicken").newToday).toBe(true);
});

test("New today is per hall: a dish routine at Chase is still new at Lenoir", async () => {
  await seedHistory(CHASE, 14, { 2: ["Waffle"] });
  await seedHistory(LENOIR, 14);
  const today = lunch([grill("Waffle")]);
  await seedMenuDay({ location: CHASE, date: TODAY, mealPeriods: today });
  await seedMenuDay({ location: LENOIR, date: TODAY, mealPeriods: today });

  const menu = await getToday({ now: SAT_LUNCHTIME });

  expect(item(menu, "Chase", "Waffle")).not.toHaveProperty("newToday");
  expect(item(menu, "Top of Lenoir", "Waffle").newToday).toBe(true);
});

test("a dish that moved stations isn't new: matching is by normalized name", async () => {
  for (let back = 1; back <= 14; back++) {
    const stations =
      back === 3 ? [{ name: "Hot Line", items: [{ name: "GRILLED  chicken Breast", recipeId: 7 }] }] : [grill("Rice")];
    await seedMenuDay({ location: LENOIR, date: daysBefore(back), mealPeriods: lunch(stations) });
  }
  await seedMenuDay({ location: LENOIR, date: TODAY, mealPeriods: lunch([grill("Grilled Chicken Breast")]) });

  const menu = await getToday({ now: SAT_LUNCHTIME });

  expect(item(menu, "Top of Lenoir", "Grilled Chicken Breast")).not.toHaveProperty("newToday");
});
