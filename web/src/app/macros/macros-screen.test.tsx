// UI smoke tests: the Macros screen (today's log and progress, past 7 days, daily targets card, combo cards per
// hall with totals against the targets used, "Log this combo", the fill-what's-left / per-meal toggle, empty states).
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import type { Allergen } from "@/lib/allergens";
import { comboItemsFrom, suggestCombos, type MacroTargets } from "@/lib/combos";
import { addCombo, addEntry, EMPTY_MEAL_LOG, type MealLog } from "@/lib/meal-log";
import type { Hall, MenuItem } from "@/lib/today";
import { MacrosScreen, type MacrosQuery } from "./macros-screen";

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
  usualHours: [],
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
  {
    includeExcludedStations = false,
    allergens = [] as Allergen[],
    query = { mode: "left" } as MacrosQuery, // targets as given unless a test picks a mode
    halls = HALLS,
    log = EMPTY_MEAL_LOG as MealLog,
  } = {},
) =>
  renderToStaticMarkup(
    <MacrosScreen
      halls={halls}
      query={query}
      filters={{ dietFilters: [], allergens }}
      targets={targets}
      onTargetsChange={() => {}}
      includeExcludedStations={includeExcludedStations}
      onIncludeExcludedStationsChange={() => {}}
      onClearFilters={() => {}}
      log={log}
      today="2026-11-11"
      onChangeServings={() => {}}
      onDeleteEntry={() => {}}
    />,
  );

/** The opening tag of the `<input>` named `name`. */
const inputTag = (html: string, name: string) => html.match(new RegExp(`<input[^>]*name="${name}"[^>]*>`))?.[0] ?? "";

test("the daily targets card has min and max inputs for each macro, showing the saved targets", () => {
  const html = render({ proteinG: { min: 30 }, calories: { max: 600 } });

  expect(html).toContain(">Daily targets<");
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
    const targets = html.indexOf("Daily targets");
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

test("without ?hall=, phones open the first hall serving the selected meal period, like Menus", () => {
  const [lenoir, chase] = HALLS;
  const dinnerOnly = { ...lenoir, mealPeriods: lenoir.mealPeriods.filter((mp) => mp.name === "Dinner") };
  const html = render({ proteinG: { min: 30 } }, { halls: [dinnerOnly, chase], query: { meal: "Lunch" } });

  expect(optionTag(html, "Dining hall", "Chase")).toContain('aria-current="true"');
  expect(html).toMatch(/<section(?![^>]*hidden)[^>]*aria-labelledby="combos-hall-chase"/);
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

const LENOIR = { slug: "top-of-lenoir", name: "Top of Lenoir" };
const CHASE = { slug: "chase", name: "Chase" };
// 140 cal, 25 g protein / 200 cal, 4 g protein; 10 g carbs and 5 g fat each.
const [CHICKEN, RICE] = HALLS[0].mealPeriods[1].stations[0].items;
const SALMON = HALLS[1].mealPeriods[1].stations[0].items[0]; // 300 cal, 34 g protein

/** 12:30pm and 6:30pm in Chapel Hill (EST) on `date`. */
const noon = (date: string) => new Date(`${date}T17:30:00Z`);
const evening = (date: string) => new Date(`${date}T23:30:00Z`);

/** Today (2026-11-11): Chicken ×2 at Lenoir lunch, Salmon at Chase dinner. Yesterday: Rice ×1½. A week ago: Salmon. */
const LOG = [
  { item: CHICKEN, hall: LENOIR, mealPeriod: "Lunch", servings: 2, at: noon("2026-11-11") },
  { item: SALMON, hall: CHASE, mealPeriod: "Dinner", servings: 1, at: evening("2026-11-11") },
  { item: RICE, hall: LENOIR, mealPeriod: "Dinner", servings: 1.5, at: evening("2026-11-10") },
  { item: SALMON, hall: CHASE, mealPeriod: "Lunch", servings: 1, at: noon("2026-11-04") },
].reduce((log, { at, ...dish }) => addEntry(log, dish, at), EMPTY_MEAL_LOG);

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

/** The markup from the h2 `heading` up to the next h2. */
function section(html: string, heading: string): string {
  const start = html.indexOf(`>${heading}</h2>`);
  const end = html.indexOf("<h2", start);
  return start === -1 ? "" : html.slice(start, end === -1 ? undefined : end);
}

test("Macros shows, in order: switchers, today's progress, today's entries, daily targets, combos, past 7 days", () => {
  const html = render({ proteinG: { min: 30 } }, { log: LOG });
  const order = [
    'aria-label="Meal period"',
    ">Today</h2>",
    ">Today&#x27;s meals</h2>",
    ">Daily targets</h2>",
    'aria-label="Totals"',
    ">Past 7 days<",
  ].map((marker) => html.indexOf(marker));

  expect(order.every((i) => i > -1)).toBe(true);
  expect([...order].sort((a, b) => a - b)).toEqual(order);
});

test("today's totals show as progress bars against the daily targets, and as plain totals without one", () => {
  // Today: 2× Chicken (280 cal, 50 g protein, 20 g carbs, 10 g fat) + Salmon (300 cal, 34 g, 10 g, 5 g).
  const html = section(render({ calories: { max: 2000 }, proteinG: { min: 120 } }, { log: LOG }), "Today");
  const bars = [...html.matchAll(/<div[^>]*role="progressbar"[^>]*>/g)].map(([tag]) => tag);

  expect(bars).toHaveLength(2);
  expect(bars[0]).toContain('aria-label="Calories"');
  expect(bars[0]).toContain('aria-valuenow="580"');
  expect(bars[0]).toContain('aria-valuemax="2000"');
  expect(bars[1]).toContain('aria-label="Protein"');
  expect(bars[1]).toContain('aria-valuenow="84"');
  expect(bars[1]).toContain('aria-valuemax="120"');
  expect(text(html)).toContain("580 of ≤ 2000 cal");
  expect(text(html)).toContain("84 of ≥ 120 g");
  expect(text(html)).toMatch(/Carbs 30 g/);
  expect(text(html)).toMatch(/Fat 15 g/);
});

test("today's entries are listed by meal period, each with a servings stepper and a delete button", () => {
  const html = section(render({}, { log: LOG }), "Today&#x27;s meals");
  const lunch = html.indexOf(">Lunch</h3>");
  const dinner = html.indexOf(">Dinner</h3>");

  expect(lunch).toBeGreaterThan(-1);
  expect(dinner).toBeGreaterThan(lunch);
  expect(html.slice(lunch, dinner)).toContain("Grilled Chicken");
  expect(text(html.slice(lunch, dinner))).toContain("Top of Lenoir");
  expect(text(html.slice(lunch, dinner))).toContain("2 servings");
  expect(html.slice(dinner)).toContain("Salmon");
  expect(html).toMatch(/aria-label="More servings of Grilled Chicken"/);
  expect(html).toMatch(/aria-label="Delete Grilled Chicken"/);
  expect(html).toMatch(/aria-label="Delete Salmon"/);
  expect(html).not.toContain("Rice"); // yesterday's
});

test("with nothing logged today, a hint explains how to log a dish", () => {
  const html = render({}, { log: EMPTY_MEAL_LOG });

  expect(text(section(html, "Today&#x27;s meals"))).toMatch(/I ate this/);
  expect(html).not.toContain('role="progressbar"');
});

test("'Past 7 days' is collapsed, lists each earlier day's totals, and opens to editable entries", () => {
  const html = render({}, { log: LOG });
  const past = html.slice(html.indexOf("<details"));

  expect(html.match(/<details[^>]*>/)?.[0]).not.toMatch(/\bopen\b/);
  expect(past).toContain(">Past 7 days<");
  const days = text(past);
  // Yesterday: 1½× Rice (200 cal, 4 g protein, 10 g carbs, 5 g fat).
  expect(days).toMatch(/Tue Nov 10 · 300 cal · 6 g protein · 15 g carbs · 7.5 g fat/);
  expect(days).toMatch(/Wed Nov 4 · 300 cal · 34 g protein/);
  expect(days.indexOf("Nov 10")).toBeLessThan(days.indexOf("Nov 4"));
  expect(past).toMatch(/aria-label="Delete Rice"/);
  expect(past).toMatch(/aria-label="Fewer servings of Rice"/);
});

test("each combo card has 'Log this combo', and a logged combo shows in today's meals and totals", () => {
  const html = render({ proteinG: { min: 30 } });
  expect(html.match(/<button[^>]*>Log this combo<\/button>/g)).toHaveLength(html.match(/aria-label="Totals"/g)!.length);

  const dinner = HALLS[0].mealPeriods[1];
  // 1× Grilled Chicken + 1× Rice: 340 cal, 29 g protein.
  const [combo] = suggestCombos({ items: comboItemsFrom(dinner), targets: { proteinG: { min: 29, max: 29 } } }).combos;
  const log = addCombo(EMPTY_MEAL_LOG, { combo, mealPeriod: dinner, hall: LENOIR }, evening("2026-11-11"));
  const after = render({ calories: { max: 2000 } }, { log });

  const meals = text(section(after, "Today&#x27;s meals"));
  expect(meals).toMatch(/Dinner Grilled Chicken Top of Lenoir · 140 cal .* Rice Top of Lenoir · 200 cal/);
  expect(text(section(after, "Today"))).toContain("340 of ≤ 2000 cal");
});

test("the targets card toggles between 'Fill what's left today' and 'Per meal', and suggestions follow", () => {
  const targets = { proteinG: { min: 40, max: 60 } };
  const left = render(targets, { query: { mode: "left" } });
  const perMeal = render(targets, { query: { mode: "per-meal" } });

  expect(optionTag(left, "Size combos", "Fill what&#x27;s left today")).toContain('aria-current="true"');
  expect(optionTag(left, "Size combos", "Per meal")).toContain('href="?mode=per-meal"');
  expect(optionTag(perMeal, "Size combos", "Per meal")).toContain('aria-current="true"');
  // The whole day's 40–60 g, or half of it for each of Lenoir's two meal periods (Lunch, Dinner).
  expect(chips(column(left, "Top of Lenoir"))).toContain("50 g protein (target 40–60, within target)");
  expect(chips(column(perMeal, "Top of Lenoir"))).toContain("25 g protein (target 20–30, within target)");
  expect(chips(column(perMeal, "Top of Lenoir"))).not.toContain("50 g protein (target 20–30)");

  // A third of 100 g per meal for a hall serving three meal periods, shown rounded.
  const brunch = { name: "Brunch", start: "10:00", end: "13:00", favorites: [], stations: [{ name: "Grill", items: [food("Omelet", 7, 300, 40)] }] };
  const halls = [{ ...HALLS[0], mealPeriods: [...HALLS[0].mealPeriods, brunch] }, HALLS[1]];
  const thirds = render({ proteinG: { min: 100 } }, { halls, query: { meal: "Brunch", mode: "per-meal" } });
  expect(chips(column(thirds, "Top of Lenoir"))).toContain("40 g protein (target ≥ 33.3, within target)");
});

test("the mode defaults to 'Fill what's left today' once something is logged today, else 'Per meal'", () => {
  const targets = { proteinG: { min: 100, max: 120 } };
  const fresh = render(targets, { query: {} });
  // Today: 84 g protein logged (Lunch at Lenoir, Dinner at Chase), so 16–36 g is left.
  const logged = render(targets, { query: {}, log: LOG });

  expect(optionTag(fresh, "Size combos", "Per meal")).toContain('aria-current="true"');
  expect(optionTag(logged, "Size combos", "Fill what&#x27;s left today")).toContain('aria-current="true"');
  expect(chips(column(logged, "Chase"))).toContain("34 g protein (target 16–36, within target)");
});

test("a daily max already reached says so instead of suggesting combos", () => {
  // Today: 580 cal logged.
  const html = render({ calories: { max: 500 }, proteinG: { min: 30 } }, { log: LOG });

  expect(text(html).replaceAll("&#x27;", "'")).toContain(
    "You've reached today's calorie maximum (500 cal), so there's nothing left to fill.",
  );
  expect(html).not.toContain('aria-label="Totals"');
});
