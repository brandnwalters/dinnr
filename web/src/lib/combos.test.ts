// Seam 2: the combo engine, a pure function from items with nutrition + macro targets to ranked combos.
import { expect, test } from "vitest";
import { suggestCombos, type ComboItem } from "./combos";

let nextId = 1;
/** A hand-built menu item with whole-serving macros. */
function item(name: string, calories: number, proteinG: number, carbsG = 0, fatG = 0): ComboItem {
  return { id: nextId++, name, station: "The Grill", macros: { calories, proteinG, carbsG, fatG } };
}

/** Each combo as "2x Chicken + 1x Rice", in the engine's ranked order. */
const described = (combos: ReturnType<typeof suggestCombos>["combos"]) =>
  combos.map((c) => c.items.map(({ item, servings }) => `${servings}x ${item.name}`).join(" + "));

test("a single item that meets a minimum protein target is suggested, one serving before two", () => {
  const chicken = item("Chicken Breast", 140, 25);

  const { combos, message } = suggestCombos({ items: [chicken], targets: { proteinG: { min: 20 } } });

  expect(described(combos)).toEqual(["1x Chicken Breast", "2x Chicken Breast"]);
  expect(combos[0].totals).toEqual({ calories: 140, proteinG: 25, carbsG: 0, fatG: 0 });
  expect(message).toBeNull();
});

test("combos use at most 3 distinct items at up to 2 whole servings each", () => {
  // Four 10 g items: the most a combo can reach is 3 items x 2 servings = 60 g.
  const items = ["Egg", "Tofu", "Beans", "Yogurt"].map((name) => item(name, 100, 10));

  const reachable = suggestCombos({ items, targets: { proteinG: { min: 60 } } });
  const unreachable = suggestCombos({ items, targets: { proteinG: { min: 61 } } });

  expect(reachable.combos.length).toBeGreaterThan(0);
  for (const combo of reachable.combos) {
    expect(combo.items).toHaveLength(3);
    expect(combo.items.every(({ servings }) => servings === 2)).toBe(true);
    expect(combo.totals.proteinG).toBe(60);
  }
  expect(unreachable.combos).toEqual([]);
});

test("fewer items rank first, even when a bigger combo lands closer to the targets", () => {
  // Protein 40-50 g (aim 45): Steak alone is 5 g off; Rice + Beans hits 45 exactly.
  const steak = item("Steak", 300, 40);
  const rice = item("Rice", 200, 15);
  const beans = item("Beans", 150, 30);

  const { combos } = suggestCombos({ items: [rice, beans, steak], targets: { proteinG: { min: 40, max: 50 } } });

  expect(described(combos)).toEqual(["1x Steak", "1x Rice + 1x Beans"]);
});

test("among combos with the same number of items, the one closest to the targets ranks first", () => {
  // Calories 500-700 (aim 600).
  const items = [item("Pasta", 510, 15), item("Burger", 610, 30), item("Burrito", 680, 25)];

  const { combos } = suggestCombos({ items, targets: { calories: { min: 500, max: 700 } } });

  expect(described(combos)).toEqual(["1x Burger", "1x Burrito", "1x Pasta"]);
});

test("at most 5 combos are suggested", () => {
  const items = Array.from({ length: 8 }, (_, i) => item(`Dish ${i}`, 200 + i * 10, 30));

  const { combos } = suggestCombos({ items, targets: { proteinG: { min: 25 } } });

  expect(combos).toHaveLength(5);
});

test("when nothing fits, the result is empty with a friendly message", () => {
  const items = [item("Side Salad", 50, 2), item("Apple", 95, 0)];

  const result = suggestCombos({ items, targets: { proteinG: { min: 40 } } });

  expect(result.combos).toEqual([]);
  expect(result.message).toMatch(/no combination .* meets all your targets/i);
});

test("with no targets set, or no items with nutrition, the result is empty with a message", () => {
  const noTargets = suggestCombos({ items: [item("Chicken Breast", 140, 25)], targets: {} });
  const noItems = suggestCombos({ items: [], targets: { proteinG: { min: 20 } } });

  expect(noTargets.combos).toEqual([]);
  expect(noTargets.message).toMatch(/set at least one target/i);
  expect(noItems.combos).toEqual([]);
  expect(noItems.message).toMatch(/no items with nutrition/i);
});

test("max-only targets: every combo stays at or under the max, the closest to it first", () => {
  const items = [item("Soup", 150, 8), item("Wrap", 450, 20), item("Pizza Slice", 300, 12)];

  const { combos } = suggestCombos({ items, targets: { calories: { max: 300 } } });

  // 2x Soup and Pizza Slice both sit exactly on 300 (ties keep menu order); Wrap and any pair go over.
  expect(described(combos)).toEqual(["2x Soup", "1x Pizza Slice", "1x Soup"]);
  for (const combo of combos) expect(combo.totals.calories).toBeLessThanOrEqual(300);
});

test("min-only targets on several macros: every minimum is met", () => {
  const items = [item("Chicken", 140, 25, 0, 3), item("Rice", 200, 4, 45, 0), item("Broccoli", 30, 3, 6, 0)];

  const { combos } = suggestCombos({ items, targets: { proteinG: { min: 25 }, carbsG: { min: 40 } } });

  expect(combos[0].items.map((i) => i.item.name)).toEqual(["Chicken", "Rice"]);
  for (const { totals } of combos) {
    expect(totals.proteinG).toBeGreaterThanOrEqual(25);
    expect(totals.carbsG).toBeGreaterThanOrEqual(40);
  }
});

test("a real day's meal period (~250 items) is searched fast enough to feel instant", () => {
  // Chase's Dinner has ~230 distinct recipes. A min-only target no pair can reach
  // forces the full 3-item search with nothing to prune: the worst case.
  const items = Array.from({ length: 250 }, (_, i) => item(`Dish ${i}`, 100 + (i % 50) * 10, 5 + (i % 13), i % 40, i % 20));

  const start = performance.now();
  const { combos } = suggestCombos({ items, targets: { proteinG: { min: 70 }, carbsG: { min: 10 } } });
  const elapsed = performance.now() - start;

  expect(combos).toHaveLength(5);
  expect(combos[0].items).toHaveLength(3);
  expect(elapsed).toBeLessThan(600); // ~250 ms on a laptop; generous for CI (a phone is a few times slower)
});

test("mixed targets: a protein minimum with a calorie maximum", () => {
  const items = [
    item("Fried Chicken", 600, 35),
    item("Grilled Chicken", 140, 25),
    item("Tofu", 180, 15),
    item("Cookie", 200, 2),
  ];

  const { combos } = suggestCombos({ items, targets: { proteinG: { min: 30 }, calories: { max: 400 } } });

  // Fried Chicken busts the calorie max; Cookie never gets a combo to 30 g under 400 cal.
  expect(described(combos)).toEqual([
    "2x Tofu", // 30 g, 360 cal: right on the protein minimum, near the calorie max
    "2x Grilled Chicken", // 50 g, 280 cal
    "1x Grilled Chicken + 1x Tofu", // 40 g, 320 cal: two items, so last
  ]);
  for (const { totals } of combos) {
    expect(totals.proteinG).toBeGreaterThanOrEqual(30);
    expect(totals.calories).toBeLessThanOrEqual(400);
  }
});
