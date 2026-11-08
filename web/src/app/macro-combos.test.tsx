// UI smoke tests: the macro targets form, and combos for each hall with totals next to the targets.
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import type { MacroTargets } from "@/lib/combos";
import type { Hall, MenuItem } from "@/lib/today";
import { MacroCombos } from "./macro-combos";

const food = (name: string, recipeId: number, calories: number, proteinG: number): MenuItem => ({
  name,
  normalizedName: name.toLowerCase(),
  recipeId,
  dietaryTags: [],
  favorite: false,
  nutrition: { servingSize: "1 each", calories, proteinG, carbsG: 10, fatG: 5 },
});

const hall = (slug: string, name: string, items: MenuItem[]): Hall => ({
  slug,
  name,
  status: "serving",
  currentMealPeriod: "Dinner",
  selectedMealPeriod: "Dinner",
  favoriteCount: 0,
  mealPeriods: [
    { name: "Lunch", start: "11:00", end: "14:00", stations: [{ name: "Grill", items: [food("Lunch Only Wrap", 9, 400, 60)] }] },
    { name: "Dinner", start: "17:00", end: "20:00", stations: [{ name: "Grill", items }] },
  ],
});

const render = (targets: MacroTargets) =>
  renderToStaticMarkup(
    <MacroCombos
      halls={[
        hall("top-of-lenoir", "Top of Lenoir", [food("Grilled Chicken", 1, 140, 25), food("Rice", 2, 200, 4)]),
        hall("chase", "Chase", [food("Salmon", 3, 300, 34)]),
      ]}
      targets={targets}
      onTargetsChange={() => {}}
    />,
  );

test("the form shows the saved targets", () => {
  const html = render({ proteinG: { min: 30 }, calories: { max: 600 } });

  expect(html).toMatch(/name="proteinG-min"[^>]*value="30"|value="30"[^>]*name="proteinG-min"/);
  expect(html).toMatch(/name="calories-max"[^>]*value="600"|value="600"[^>]*name="calories-max"/);
});

test("each hall gets combos from its selected meal, with totals next to the targets", () => {
  const html = render({ proteinG: { min: 30 }, calories: { max: 600 } });

  const lenoir = html.slice(html.indexOf("Top of Lenoir"), html.indexOf("Chase"));
  const chase = html.slice(html.indexOf("Chase"));
  expect(lenoir).toContain("2× Grilled Chicken");
  expect(lenoir).toContain("50 g protein");
  expect(lenoir).toContain("≥ 30");
  expect(lenoir).toContain("280 cal");
  expect(lenoir).toContain("≤ 600");
  expect(chase).toContain("1× Salmon");
  expect(html).not.toContain("Lunch Only Wrap"); // not the selected meal
});

test("a hall where nothing fits says so, and with no targets the form asks for one", () => {
  expect(render({ proteinG: { min: 100 } })).toMatch(/No combination of up to 3 items meets all your targets/);
  expect(render({})).toContain("Set at least one target");
});
