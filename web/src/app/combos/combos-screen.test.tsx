// UI smoke tests: the Combos screen (targets card, combo cards per hall with totals against the targets, empty states).
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import type { Allergen } from "@/lib/allergens";
import type { MacroTargets } from "@/lib/combos";
import type { Hall, MenuItem } from "@/lib/today";
import { CombosScreen, type CombosQuery } from "./combos-screen";

const food = (name: string, recipeId: number, calories: number, proteinG: number): MenuItem => ({
  name,
  normalizedName: name.toLowerCase(),
  recipeId,
  dietaryTags: [],
  allergens: [],
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
    { name: "Lunch", start: "11:00", end: "14:00", favorites: [], stations: [{ name: "Grill", items: [food("Lunch Only Wrap", 9, 400, 60)] }] },
    {
      name: "Dinner",
      start: "17:00",
      end: "20:00",
      favorites: [],
      stations: [
        { name: "Grill", items },
        { name: "Condiments and Spreads", excludedFromCombos: true, items: [food("Peanut Butter", 8, 190, 8)] },
      ],
    },
  ],
});

const HALLS = [
  hall("top-of-lenoir", "Top of Lenoir", [food("Grilled Chicken", 1, 140, 25), food("Rice", 2, 200, 4)]),
  hall("chase", "Chase", [food("Salmon", 3, 300, 34)]),
];

const render = (
  targets: MacroTargets,
  { includeExcludedStations = false, allergens = [] as Allergen[], query = {} as CombosQuery, halls = HALLS } = {},
) =>
  renderToStaticMarkup(
    <CombosScreen
      halls={halls}
      query={query}
      dietFilters={[]}
      allergens={allergens}
      targets={targets}
      onTargetsChange={() => {}}
      includeExcludedStations={includeExcludedStations}
      onIncludeExcludedStationsChange={() => {}}
      onClearFilters={() => {}}
    />,
  );

/** The opening tag of the `<input>` named `name`. */
const inputTag = (html: string, name: string) => html.match(new RegExp(`<input[^>]*name="${name}"[^>]*>`))?.[0] ?? "";

test("the targets card has min and max inputs for each macro, showing the saved targets", () => {
  const html = render({ proteinG: { min: 30 }, calories: { max: 600 } });

  expect(html).toContain("Targets");
  for (const macro of ["calories", "proteinG", "carbsG", "fatG"]) {
    for (const bound of ["min", "max"]) expect(inputTag(html, `${macro}-${bound}`)).toContain('type="number"');
  }
  expect(inputTag(html, "proteinG-min")).toContain('value="30"');
  expect(inputTag(html, "calories-max")).toContain('value="600"');
  expect(inputTag(html, "proteinG-max")).toContain('value=""');
  expect(html).toMatch(/aria-label="Minimum protein \(g\)"/);
});

/** One hall's column: from its heading to the next hall's. */
function column(html: string, hall: string): string {
  const start = html.indexOf(`>${hall}</h2>`);
  const end = html.indexOf("</h2>", start + hall.length + 6);
  return html.slice(start, end === -1 ? undefined : end);
}

/** The text of each totals chip in `html`, tags stripped. */
const chips = (html: string) =>
  [...html.matchAll(/<ul aria-label="Totals"[^>]*>(.*?)<\/ul>/g)].flatMap(([, list]) =>
    [...list.matchAll(/<li[^>]*>(.*?)<\/li>/g)].map(([, chip]) => chip.replace(/<[^>]+>/g, "")),
  );

test("each hall gets combo cards from the selected meal, listing items with servings and totals chips", () => {
  const html = render({ proteinG: { min: 30 }, calories: { max: 600 } });

  const lenoir = column(html, "Top of Lenoir");
  const chase = column(html, "Chase");
  expect(lenoir).toContain("2× Grilled Chicken");
  expect(chips(lenoir)).toEqual(
    expect.arrayContaining(["280 cal (target ≤ 600, within target)", "50 g protein (target ≥ 30, within target)"]),
  );
  expect(chase).toContain("1× Salmon");
  expect(chips(chase)).toEqual(
    expect.arrayContaining(["300 cal (target ≤ 600, within target)", "34 g protein (target ≥ 30, within target)"]),
  );
  expect(html).not.toContain("Lunch Only Wrap"); // not the selected meal
});

test("only totals whose macro has a target show that target and are marked within target", () => {
  const firstCard = chips(column(render({ proteinG: { min: 30 } }), "Chase")).slice(0, 4); // 1× Salmon
  const ranged = chips(column(render({ calories: { min: 200, max: 400 }, proteinG: { min: 30 } }), "Chase"));

  expect(firstCard).toEqual(["300 cal", "34 g protein (target ≥ 30, within target)", "10 g carbs", "5 g fat"]);
  expect(ranged[0]).toBe("300 cal (target 200–400, within target)");
});

test("with no targets, a prompt asks for at least one instead of each hall's combos", () => {
  const html = render({});

  expect(html.match(/Set at least one target/g)).toHaveLength(1);
  expect(html).not.toContain("Grilled Chicken");
  expect(html).not.toContain(">Top of Lenoir</h2>");
});

test("a hall where nothing fits shows the engine's message as an empty state, and the other hall its combos", () => {
  const html = render({ proteinG: { min: 50, max: 60 } });

  expect(column(html, "Chase")).toMatch(/No combination of up to 3 items meets all your targets/);
  expect(column(html, "Chase")).not.toContain('aria-label="Totals"');
  expect(column(html, "Top of Lenoir")).toContain("2× Grilled Chicken");
});

test("a hall with only condiment-type items says how to include them", () => {
  const condimentsOnly = [hall("chase", "Chase", [])];
  const html = render({ proteinG: { min: 1 } }, { halls: condimentsOnly });

  expect(html).toContain("Include condiments, beverages and cereal&quot; to use them");
});

/** The opening `<a>` tag of the option labelled `label` inside the control labelled `control`. */
function optionTag(html: string, control: string, label: string): string {
  const nav = html.slice(html.indexOf(`aria-label="${control}"`));
  return nav.slice(0, nav.indexOf(`>${label}<`) + 1).match(/<a\b[^>]*>/g)?.at(-1) ?? "";
}

test("?meal= picks the meal period for every hall, like Menus", () => {
  const html = render({ proteinG: { min: 30 } }, { query: { meal: "Lunch" } });

  expect(optionTag(html, "Meal period", "Lunch")).toContain('aria-current="true"');
  expect(html).toContain("Lunch Only Wrap");
  expect(html).not.toContain("Grilled Chicken");
});

test("a hall that doesn't serve the selected meal period says so", () => {
  const brunch = { name: "Brunch", start: "10:00", end: "13:00", favorites: [], stations: [{ name: "Grill", items: [food("Omelet", 7, 300, 30)] }] };
  const halls = [{ ...HALLS[0], mealPeriods: [...HALLS[0].mealPeriods, brunch] }, HALLS[1]];
  const html = render({ proteinG: { min: 30 } }, { halls, query: { meal: "Brunch" } });

  expect(column(html, "Top of Lenoir")).toContain("1× Omelet");
  expect(column(html, "Chase")).toContain("Not serving Brunch");
});

test("a hall closed all day or with no menu yet says so instead of 'Not serving'", () => {
  const allDay = (status: Hall["status"]): Hall => ({
    ...HALLS[1],
    status,
    currentMealPeriod: null,
    selectedMealPeriod: null,
    mealPeriods: [],
  });
  const closed = column(render({ proteinG: { min: 30 } }, { halls: [HALLS[0], allDay("closed-today")] }), "Chase");
  const noMenu = column(render({ proteinG: { min: 30 } }, { halls: [HALLS[0], allDay("no-menu")] }), "Chase");

  expect(closed).toContain("Closed all day");
  expect(noMenu).toContain("Check back later");
  for (const html of [closed, noMenu]) expect(html).not.toContain("Not serving");
});

test("when filters hide every dish in a hall's meal period, it says so and offers Clear filters", () => {
  const filteredOut: Hall = { ...HALLS[1], mealPeriods: HALLS[1].mealPeriods.map((mp) => ({ ...mp, stations: [] })) };
  const html = render({ proteinG: { min: 30 } }, { halls: [HALLS[0], filteredOut] });

  expect(column(html, "Chase")).toContain("No items match your filters");
  expect(column(html, "Chase")).toMatch(/<button\b[^>]*>Clear filters<\/button>/);
  expect(column(html, "Top of Lenoir")).not.toContain("Clear filters");
});

test("the meal-period and hall switchers come first, above the targets card, even before any target is set", () => {
  for (const html of [render({}), render({ proteinG: { min: 30 } })]) {
    const targets = html.indexOf("Targets for one meal");
    expect(html.indexOf('aria-label="Meal period"')).toBeGreaterThan(-1);
    expect(html.indexOf('aria-label="Meal period"')).toBeLessThan(targets);
    expect(html.indexOf('aria-label="Dining hall"')).toBeGreaterThan(-1);
    expect(html.indexOf('aria-label="Dining hall"')).toBeLessThan(targets);
  }
});

test("the hall switcher selects ?hall=, the first hall by default, keeping ?meal=", () => {
  expect(optionTag(render({ proteinG: { min: 30 } }), "Dining hall", "Top of Lenoir")).toContain('aria-current="true"');
  const html = render({ proteinG: { min: 30 } }, { query: { hall: "chase", meal: "Dinner" } });

  expect(optionTag(html, "Dining hall", "Chase")).toContain('aria-current="true"');
  expect(optionTag(html, "Dining hall", "Top of Lenoir")).toContain('href="?hall=top-of-lenoir&amp;meal=Dinner"');
});

test("the allergen disclaimer shows only when an allergen filter is on", () => {
  const disclaimer = /Allergen filters are not a guarantee/;

  expect(render({ proteinG: { min: 30 } }, { allergens: ["milk"] })).toMatch(disclaimer);
  expect(render({ proteinG: { min: 30 } })).not.toMatch(disclaimer);
});

test("condiment-type stations stay out of combos until the switch is on", () => {
  const toggle = (html: string) => html.match(/<button[^>]*role="switch"[^>]*>/)?.[0] ?? "";
  const off = render({ proteinG: { min: 8, max: 9 } });
  const on = render({ proteinG: { min: 8, max: 9 } }, { includeExcludedStations: true });

  expect(off).toMatch(/<label[^>]*for="include-excluded-stations"[^>]*>Include condiments, beverages and cereal</);
  expect(toggle(off)).toContain('id="include-excluded-stations"');
  expect(toggle(off)).toContain('aria-checked="false"');
  expect(off).not.toContain("Peanut Butter");
  expect(toggle(on)).toContain('aria-checked="true"');
  expect(on).toContain("Peanut Butter");
});
