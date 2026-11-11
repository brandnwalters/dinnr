// UI smoke tests: the Menus screen (meal-period and hall switchers, "Not serving", favorites before the first station).
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import type { Hall, MealPeriod, MenuItem } from "@/lib/today";
import { MenusScreen } from "./menus-screen";

const item = (name: string, recipeId: number, favorite = false): MenuItem => ({
  name,
  recipeId,
  normalizedName: name.toLowerCase(),
  favorite,
  dietaryTags: [],
  allergens: [],
});

const meal = (name: string, start: string, end: string, stations: MealPeriod["stations"]): MealPeriod => ({
  name,
  start,
  end,
  stations,
  favorites: stations.flatMap((s) => s.items.filter((i) => i.favorite).map((i) => ({ station: s.name, item: i }))),
});

const lenoir: Hall = {
  slug: "top-of-lenoir",
  name: "Top of Lenoir",
  status: "serving",
  currentMealPeriod: "Lunch",
  selectedMealPeriod: "Lunch",
  favoriteCount: 1,
  mealPeriods: [
    meal("Lunch", "11:00", "14:30", [
      { name: "Grill", items: [item("Nashville Hot Chicken Biscuit", 15469)] },
      { name: "Pasta", items: [item("Penne Alfredo", 20001), item("Grilled Chicken Breast", 13708, true)] },
    ]),
    meal("Dinner", "17:00", "20:00", [{ name: "Grill", items: [item("Cheeseburger", 30001)] }]),
  ],
};

const chase: Hall = {
  slug: "chase",
  name: "Chase",
  status: "serving",
  currentMealPeriod: "Late Lunch",
  selectedMealPeriod: "Late Lunch",
  favoriteCount: 0,
  mealPeriods: [
    meal("Late Lunch", "14:00", "16:30", [{ name: "Deli", items: [item("Turkey Club", 40001)] }]),
    meal("Dinner", "17:00", "21:00", [{ name: "Wok", items: [item("Lo Mein", 50001)] }]),
  ],
};

const render = (query: { meal?: string; hall?: string } = {}) =>
  renderToStaticMarkup(<MenusScreen halls={[lenoir, chase]} query={query} />);

/** One hall's column: from its heading to the next hall's. */
function column(html: string, hall: string): string {
  const start = html.indexOf(`>${hall}</h2>`);
  const end = html.indexOf("</h2>", start + hall.length + 6);
  return html.slice(start, end === -1 ? undefined : end);
}

/** The opening `<a>` tag of the option labelled `label` inside the control labelled `control`. */
function optionTag(html: string, control: string, label: string): string {
  const nav = html.slice(html.indexOf(`aria-label="${control}"`));
  return nav.slice(0, nav.indexOf(`>${label}<`) + 1).match(/<a\b[^>]*>/g)?.at(-1) ?? "";
}

test("one meal-period switcher lists both halls' meal periods, current one selected by default", () => {
  const html = render();
  expect(html.match(/aria-label="Meal period"/g)).toHaveLength(1);
  for (const name of ["Lunch", "Late Lunch", "Dinner"]) expect(optionTag(html, "Meal period", name)).toContain("href=");
  expect(optionTag(html, "Meal period", "Lunch")).toContain('aria-current="true"');
});

test("the selected meal period switches every hall that serves it", () => {
  const html = render({ meal: "Dinner" });
  expect(optionTag(html, "Meal period", "Dinner")).toContain('aria-current="true"');
  expect(html).toContain("Cheeseburger");
  expect(html).toContain("Lo Mein");
  expect(html).not.toContain("Penne Alfredo");
  expect(html).not.toContain("Turkey Club");
});

test("a hall that doesn't serve the selected meal period says so", () => {
  const html = render({ meal: "Late Lunch" });
  expect(column(html, "Top of Lenoir")).toContain("Not serving Late Lunch");
  expect(column(html, "Chase")).not.toContain("Not serving");
  expect(column(html, "Chase")).toContain("Turkey Club");
});

test("a hall switcher selects the hall from ?hall=, the first hall by default, keeping ?meal=", () => {
  expect(optionTag(render(), "Dining hall", "Top of Lenoir")).toContain('aria-current="true"');
  const html = render({ hall: "chase", meal: "Dinner" });
  expect(optionTag(html, "Dining hall", "Chase")).toContain('aria-current="true"');
  expect(optionTag(html, "Dining hall", "Top of Lenoir")).not.toContain("aria-current");
  expect(optionTag(html, "Dining hall", "Top of Lenoir")).toContain('href="?hall=top-of-lenoir&amp;meal=Dinner"');
});

test("without ?hall=, phones open the first hall serving the selected meal period; ?hall= still wins", () => {
  const html = render({ meal: "Late Lunch" });
  expect(optionTag(html, "Dining hall", "Chase")).toContain('aria-current="true"');
  expect(optionTag(html, "Dining hall", "Top of Lenoir")).not.toContain("aria-current");
  expect(html).toMatch(/<section(?![^>]*hidden)[^>]*aria-labelledby="menus-hall-chase"/);
  expect(optionTag(render({ meal: "Late Lunch", hall: "top-of-lenoir" }), "Dining hall", "Top of Lenoir")).toContain(
    'aria-current="true"',
  );
});

test("each hall's favorites, with their stations, come before its first station", () => {
  const html = render();
  const lenoirColumn = column(html, "Top of Lenoir");
  const firstStation = lenoirColumn.indexOf('id="station-top-of-lenoir-grill"');
  const favorites = lenoirColumn.slice(lenoirColumn.indexOf("Your favorites"), firstStation);
  expect(lenoirColumn.indexOf("Your favorites")).toBeGreaterThan(-1);
  expect(firstStation).toBeGreaterThan(lenoirColumn.indexOf("Your favorites"));
  expect(favorites).toContain("Grilled Chicken Breast");
  expect(favorites).toContain("Pasta");
  expect(favorites).not.toContain("Nashville");
});

test("each hall has a row of station chips linking to that hall's station anchors", () => {
  const html = render();
  const lenoirColumn = column(html, "Top of Lenoir");
  expect(lenoirColumn).toContain('aria-label="Top of Lenoir stations"');
  expect(optionTag(html, "Top of Lenoir stations", "Grill")).toContain(
    'href="/menus?hall=top-of-lenoir&amp;meal=Lunch#station-top-of-lenoir-grill"',
  );
  expect(optionTag(html, "Top of Lenoir stations", "Pasta")).toContain("#station-top-of-lenoir-pasta");
  expect(lenoirColumn).toContain('id="station-top-of-lenoir-grill"');
  expect(lenoirColumn).toContain('id="station-top-of-lenoir-pasta"');
  const lateLunch = render({ meal: "Late Lunch" });
  expect(optionTag(lateLunch, "Chase stations", "Deli")).toContain(
    'href="/menus?hall=chase&amp;meal=Late+Lunch#station-chase-deli"',
  );
  expect(column(lateLunch, "Chase")).toContain('id="station-chase-deli"');
});

test("when filters hide every dish in a hall's meal period, it says so and offers Clear filters", () => {
  const filteredOut: Hall = { ...chase, mealPeriods: [meal("Late Lunch", "14:00", "16:30", [])] };
  const html = renderToStaticMarkup(
    <MenusScreen halls={[lenoir, filteredOut]} query={{ meal: "Late Lunch" }} onClearFilters={() => {}} />,
  );
  const chaseColumn = column(html, "Chase");
  expect(chaseColumn).toContain("No items match your filters");
  expect(chaseColumn).toMatch(/<button\b[^>]*>Clear filters<\/button>/);
  expect(chaseColumn).not.toContain('aria-label="Chase stations"');
  expect(column(html, "Top of Lenoir")).not.toContain("No items match your filters");
});

test("a hall with no menu posted for today says so instead of a meal period", () => {
  const noMenu: Hall = {
    ...chase,
    status: "no-menu",
    currentMealPeriod: null,
    selectedMealPeriod: null,
    mealPeriods: [],
  };
  const html = render();
  expect(html).not.toContain("Check back later");
  const chaseColumn = column(
    renderToStaticMarkup(<MenusScreen halls={[lenoir, noMenu]} query={{}} />),
    "Chase",
  );
  expect(chaseColumn).toContain("Check back later");
  expect(chaseColumn).not.toContain("Not serving");
});

test("with no menus posted anywhere, every hall says there's no menu yet", () => {
  const noMenu = (hall: Hall): Hall => ({
    ...hall,
    status: "no-menu",
    currentMealPeriod: null,
    selectedMealPeriod: null,
    mealPeriods: [],
  });
  const html = renderToStaticMarkup(<MenusScreen halls={[noMenu(lenoir), noMenu(chase)]} query={{}} />);
  expect(column(html, "Top of Lenoir")).toContain("Check back later");
  expect(column(html, "Chase")).toContain("Check back later");
});

test("a hall closed all day says so instead of a meal period", () => {
  const closed: Hall = { ...chase, status: "closed-today", currentMealPeriod: null, selectedMealPeriod: null, mealPeriods: [] };
  const chaseColumn = column(renderToStaticMarkup(<MenusScreen halls={[lenoir, closed]} query={{}} />), "Chase");
  expect(chaseColumn).toContain("Closed all day");
  expect(chaseColumn).not.toContain("Not serving");
});

test("station chips follow the selected meal period", () => {
  const html = render({ meal: "Dinner" });
  expect(optionTag(html, "Top of Lenoir stations", "Grill")).toContain("meal=Dinner#station-top-of-lenoir-grill");
  expect(column(html, "Top of Lenoir")).not.toContain(">Pasta<");
});
